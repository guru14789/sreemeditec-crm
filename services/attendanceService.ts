
import { db } from '../firebase';
import { doc, getDoc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { AttendanceRecord } from '../types';

export const markAttendance = async (userId: string, userName: string, workMode: string) => {
  const today = new Date().toISOString().split('T')[0];
  const recordId = `${userId}_${today}`;
  const recordRef = doc(db, "attendance", recordId);

  const existing = await getDoc(recordRef);
  if (existing.exists()) {
    throw new Error("Attendance already finalized for today.");
  }

  const record: Partial<AttendanceRecord> = {
    id: recordId,
    userId,
    userName,
    date: today,
    checkIn: serverTimestamp(),
    status: 'Present',
    workMode: workMode as any
  };

  return setDoc(recordRef, record);
};

export const closeShift = async (userId: string) => {
  const today = new Date().toISOString().split('T')[0];
  const recordId = `${userId}_${today}`;
  const recordRef = doc(db, "attendance", recordId);
  
  return updateDoc(recordRef, {
    checkOut: serverTimestamp()
  });
};
