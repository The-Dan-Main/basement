const DB_NAME = 'basement-offline';
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);
		request.onupgradeneeded = () => {
			const db = request.result;
			if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
			if (!db.objectStoreNames.contains('outbox')) {
				db.createObjectStore('outbox', { keyPath: 'id', autoIncrement: true });
			}
		};
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error ?? new Error('indexeddb'));
	});
}

function wait<T>(request: IDBRequest<T>): Promise<T> {
	return new Promise((resolve, reject) => {
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error ?? new Error('indexeddb'));
	});
}

export async function kvGet<T>(key: string): Promise<T | undefined> {
	const db = await openDb();
	try {
		return await wait(db.transaction('kv', 'readonly').objectStore('kv').get(key));
	} finally {
		db.close();
	}
}

export async function kvSet<T>(key: string, value: T): Promise<void> {
	const db = await openDb();
	try {
		await wait(db.transaction('kv', 'readwrite').objectStore('kv').put(value, key));
	} finally {
		db.close();
	}
}

export async function kvDelete(key: string): Promise<void> {
	const db = await openDb();
	try {
		await wait(db.transaction('kv', 'readwrite').objectStore('kv').delete(key));
	} finally {
		db.close();
	}
}

export type OutboxRecord<T = unknown> = {
	id?: number;
	type: string;
	payload: T;
	createdAt: string;
};

export async function outboxAdd<T>(type: string, payload: T): Promise<void> {
	const db = await openDb();
	try {
		await wait(
			db
				.transaction('outbox', 'readwrite')
				.objectStore('outbox')
				.add({
					type,
					payload,
					createdAt: new Date().toISOString()
				} satisfies OutboxRecord<T>)
		);
	} finally {
		db.close();
	}
}

export async function outboxAll<T = unknown>(): Promise<OutboxRecord<T>[]> {
	const db = await openDb();
	try {
		return await wait(db.transaction('outbox', 'readonly').objectStore('outbox').getAll());
	} finally {
		db.close();
	}
}

export async function outboxDelete(id: number): Promise<void> {
	const db = await openDb();
	try {
		await wait(db.transaction('outbox', 'readwrite').objectStore('outbox').delete(id));
	} finally {
		db.close();
	}
}

export async function outboxCount(): Promise<number> {
	const db = await openDb();
	try {
		return await wait(db.transaction('outbox', 'readonly').objectStore('outbox').count());
	} finally {
		db.close();
	}
}
