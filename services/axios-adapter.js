import axios from 'axios';
import { config } from 'dotenv';
config();

// Configuration API request
const axiosConfig = {
  headers: {
    Authorization: `Bearer ${process.env.API_KEY}`,
    Accept: 'application/json'
  }
};

// Get request
export async function requestApiGet(uri) {
  try {
    const responseApi = await axios.get(uri, axiosConfig);
    return responseApi.data;
  } catch (error) {
    throw error;
  }
}

// Post request
export async function requestApiPost(uri, data) {
  try {
    const responseApi = await axios.post(uri, data, axiosConfig);
    return responseApi.data;
  } catch (error) {
    throw error;
  }
}
