import cookieParser from 'cookie-parser';
import cors from 'cors';
import 'dotenv/config';
import express from 'express';
import path from 'path';
import Stripe from 'stripe';
import {v4 as uuidV4} from 'uuid';
import {getContactPurchasedItems, linkContactAndItem} from './contacts.js';
import {items} from './data.js';
import {sendAllDownloadLinks, sendDownloadLink} from './mailer.js';

const downloadLinkMap = new Map();
const DOWNLOAD_LINK_EXPIRATION = 10 * 60 * 1000; // 10 minutes
const COOKIE_EXPIRATION = 30 * 24 * 60 * 60 * 1000; // 30 days

const stripe = Stripe(process.env.STRIPE_PRIVATE_KEY);
const app = express();

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(
	cors({
		credentials: true,
		origin: process.env.CLIENT_URL,
	})
);
// Serve static files from the public directory
app.use(express.static(path.join(process.cwd(), 'public')));

app.get('/', (req, res) => {
	res.json('Welcome To My Course Store Server');
});

app.get('/items', async (req, res) => {
	const email = req.cookies.email;

	const purchasedItemIds = (await getContactPurchasedItems(email)).map(
		item => item.id
	);
	res.json(
		items.map(item => {
			return {
				id: item.id,
				name: item.name,
				price: item.priceInCents / 100,
				purchased: purchasedItemIds.includes(item.id),
			};
		})
	);
});

app.post('/download-email', (req, res) => {
	const email = req.cookies.email;
	const itemId = req.body.itemId;
	const code = createDownloadCode(itemId);
	const item = items.find(i => i.id === parseInt(itemId));

	if (item) {
		sendDownloadLink(email, code, item)
			.then(() => {
				res.json({message: 'Check your email'});
			})
			.catch(() => {
				res.status(500).json({message: 'Error: Please try again'});
			});
	} else {
		res.status(404).json({message: 'Item not found'});
	}
});

app.post('/download-all', async (req, res) => {
	const email = req.body.email;
	const items = await getContactPurchasedItems(email);
	setEmailCookie(res, email);
	sendAllDownloadLinks(
		email,
		items.map(item => {
			return {item, code: createDownloadCode(item.id)};
		})
	);

	return res.json({message: 'Check your email for a download link'});
});

app.post('/create-checkout-session', async (req, res) => {
	const item = items.find(i => i.id === parseInt(req.body.itemId));
	if (item == null) {
		return res.status(400).json({message: 'Invalid Item'});
	}
	const session = await createCheckoutSession(item);
	res.json({id: session.id});
});

app.get('/download/:code', (req, res) => {
	const itemId = downloadLinkMap.get(req.params.code);
	if (itemId == null) {
		return res.send('This link has either expired or is invalid');
	}

	const item = items.find(i => i.id === itemId);
	if (item == null) {
		return res.send('This item could not be found');
	}

	downloadLinkMap.delete(req.params.code);
	res.redirect(`/downloads/${item.file}`);
});

app.get('/purchase-success', async (req, res) => {
	const item = items.find(i => i.id === parseInt(req.query.itemId));
	const {
		customer_details: {email},
	} = await stripe.checkout.sessions.retrieve(req.query.sessionId);

	setEmailCookie(res, email);
	linkContactAndItem(email, item);
	const downloadLinkCode = createDownloadCode(item.id);
	sendDownloadLink(email, downloadLinkCode, item);

	res.redirect(`${process.env.CLIENT_URL}/download-links.html`);
});

function setEmailCookie(res, email) {
	if (!email) {
		console.error('Email is undefined in setEmailCookie');
		return;
	}

	res.cookie('email', email, {
		httpOnly: true,
		secure: true,
		maxAge: COOKIE_EXPIRATION,
		sameSite: 'None',
	});
}

function createCheckoutSession(item) {
	return stripe.checkout.sessions.create({
		line_items: [
			{
				price_data: {
					currency: 'usd',
					product_data: {
						name: item.name,
					},
					unit_amount: item.priceInCents,
				},
				quantity: 1,
			},
		],
		mode: 'payment',
		success_url: `${process.env.SERVER_URL}/purchase-success?itemId=${item.id}&sessionId={CHECKOUT_SESSION_ID}`,
		cancel_url: process.env.CLIENT_URL,
	});
}

function createDownloadCode(itemId) {
	const downloadUuid = uuidV4();
	downloadLinkMap.set(downloadUuid, itemId);
	setTimeout(() => {
		downloadLinkMap.delete(downloadUuid);
	}, DOWNLOAD_LINK_EXPIRATION);

	return downloadUuid;
}

app.listen(3000);
