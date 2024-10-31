import {items} from './data.js';
import apiInstance from './sendInBlueApiInstance.js';

async function linkContactAndItem(email, {listId}) {
	if (!email || !listId) {
		console.error('Email or listId is missing');
		return null;
	}

	const contact = await getContact(email);
	return contact
		? updateContact(contact.id, listId)
		: createContact(email, listId);
}

async function getContactPurchasedItems(email) {
	if (!email) return [];
	const contact = await getContact(email);
	return contact
		? items.filter(item => contact.listIds.includes(item.listId))
		: [];
}

function createContact(email, listId) {
	if (!email || !listId) {
		console.error('Email or listId is missing');
		return null;
	}
	return apiInstance.post('/contacts', {email, listIds: [listId]});
}

function updateContact(emailOrId, listId) {
	if (!emailOrId || !listId) {
		console.error('EmailOrId or listId is missing');
		return null;
	}
	return apiInstance.put(`/contacts/${emailOrId}`, {listIds: [listId]});
}

const getContact = async emailOrId => {
	if (!emailOrId) {
		console.error('EmailOrId is missing');
		return null;
	}

	try {
		const response = await apiInstance.get(`/contacts/${emailOrId}`);
		return response.data;
	} catch (e) {
		if (e.response?.status === 404) return null;
		console.error('Error fetching contact:', e.message);
		throw e;
	}
};

export {getContactPurchasedItems, linkContactAndItem};
