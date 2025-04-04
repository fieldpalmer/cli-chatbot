import { db } from '../firebase';
import { collection, addDoc, getDocs, doc, deleteDoc, query, orderBy, updateDoc, where } from 'firebase/firestore';

export interface Message {
     role: 'user' | 'bot';
     content: string;
     timestamp: Date;
     sessionId: string;
}

export interface Session {
     id: string;
     name: string;
     createdAt: Date;
}

// Sessions
export const createSession = async (name: string): Promise<Session> => {
     const sessionsRef = collection(db, 'sessions');
     const newSession = {
          name,
          createdAt: new Date()
     };

     const docRef = await addDoc(sessionsRef, newSession);
     return {
          id: docRef.id,
          ...newSession
     };
};

export const getSessions = async (): Promise<Session[]> => {
     const sessionsRef = collection(db, 'sessions');
     const q = query(sessionsRef, orderBy('createdAt', 'desc'));
     const snapshot = await getDocs(q);

     return snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt.toDate()
     })) as Session[];
};

export const deleteSession = async (sessionId: string): Promise<void> => {
     // Delete session
     await deleteDoc(doc(db, 'sessions', sessionId));

     // Delete associated messages
     const messagesRef = collection(db, 'messages');
     const q = query(messagesRef, where('sessionId', '==', sessionId));
     const snapshot = await getDocs(q);

     // Delete all messages in parallel
     await Promise.all(snapshot.docs.map((doc) => deleteDoc(doc.ref)));
};

export const renameSession = async (sessionId: string, newName: string): Promise<void> => {
     const sessionRef = doc(db, 'sessions', sessionId);
     await updateDoc(sessionRef, { name: newName });
};

// Messages
export const addMessage = async (message: Omit<Message, 'id'>): Promise<void> => {
     const messagesRef = collection(db, 'messages');
     await addDoc(messagesRef, {
          ...message,
          timestamp: new Date()
     });
};

export const getSessionMessages = async (sessionId: string): Promise<Message[]> => {
     const messagesRef = collection(db, 'messages');
     const q = query(messagesRef, where('sessionId', '==', sessionId), orderBy('timestamp', 'asc'));

     const snapshot = await getDocs(q);
     return snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
               id: doc.id,
               role: data.role as 'user' | 'bot',
               content: data.content as string,
               sessionId: data.sessionId as string,
               timestamp: data.timestamp.toDate()
          };
     });
};
