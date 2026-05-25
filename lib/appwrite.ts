import { Client, Databases, ID, Query } from 'appwrite';

const client = new Client()
    .setEndpoint('https://cloud.appwrite.io/v1')
    .setProject('6a11e51d001553538418');

export const databases = new Databases(client);

// Экспортируем нужные утилиты
export { ID, Query };
