/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface DetectedPlate {
  id: string;
  plate: string;
  timestamp: number;
  confidence: number;
  thumbnail: string; // base64 or blob URL
}

export interface DetectionResult {
  plate: string | null;
  confidence: number;
}
