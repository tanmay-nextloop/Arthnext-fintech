// signature.models.ts
export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  color: string;
}

// Base signature area (used by PDF viewer)
export interface SignatureArea {
  signatureId: string;
  userId: string;
  userName: string;
  pageNumber: number;
  area: Rectangle;
  color: string;
}

// Visual signature with image data (used by main component)
export interface VisualSignatureArea extends SignatureArea {
  signatureImageData: string; // Base64 image
}

// Crypto signature (same structure, just marked differently)
export type CryptographicSignatureArea = VisualSignatureArea;