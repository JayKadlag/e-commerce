import apiInstance from './sendInBlueApiInstance.js';

function sendDownloadLink(email, downloadLinkCode, item) {
	const downloadLink = `${process.env.SERVER_URL}/download/${downloadLinkCode}`;

	return sendEmail({
		email,
		subject: `Download ${item.name}`,
		htmlContent: `<h1>Thank you for purchasing ${item.name}</h1>
    
    <a href="${downloadLink}">Download it now</a>`,
		textContent: `Thank you for purchasing ${item.name} 
Download it now. ${downloadLink}`,
	});
}

function sendAllDownloadLinks(email, downloadableItems) {
	if (downloadableItems.length === 0) return;

	return sendEmail({
		email,
		subject: 'Download your files',
		htmlContent: downloadableItems
			.map(({item, code}) => {
				return `<a href="${process.env.SERVER_URL}/download/${code}">Download ${item.name}</a>`;
			})
			.join('<br>'),
		textContent: downloadableItems
			.map(({item, code}) => {
				return `Download ${item.name} ${process.env.SERVER_URL}/download/${code}`;
			})
			.join('\n'),
	});
}

function sendEmail({email, ...options}) {
	const sender = {
		name: 'Jay from JK DEV',
		email: 'jaykadlag14@gmail.com',
	};

	return apiInstance.post('/smtp/email', {
		sender,
		replyTo: sender,
		to: [{email}],
		...options,
	});
}

export {sendAllDownloadLinks, sendDownloadLink};
