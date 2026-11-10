import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";
import { app } from "./firebase";

export const storage = getStorage(app);
export const auth = getAuth(app);
