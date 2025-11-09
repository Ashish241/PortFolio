import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getFirebaseAdminApp } from '@/lib/firebase/config';

type Message = {
    name: string;
    email: string;
    message: string;
    budget?: string;
}

export async function saveMessage(message: Message) {
    const app = getFirebaseAdminApp();
    const db = getFirestore(app);

    const messageData = {
        ...message,
        createdAt: Timestamp.now(),
    };

    const docRef = await db.collection('messages').add(messageData);
    return docRef.id;
}
