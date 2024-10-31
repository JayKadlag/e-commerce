import axios from 'axios';

const apiInstance = axios.create({
	baseURL: 'https://api.brevo.com/v3',
	headers: {'api-key': process.env.SEND_IN_BLUE_API_KEY},
});

export default apiInstance;
