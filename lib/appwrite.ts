import { Client, Databases } from 'appwrite';

const client = new Client()
    .setEndpoint('https://cloud.appwrite.io/v1')
    .setProject('6a11e51d001553538418');   // Твой Project ID

export const databases = new Databases(client);
