/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from "@google/genai";
import { DetectionResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SYSTEM_PROMPT = `
Bạn là một chuyên gia nhận diện biển số xe (ALPR).
Nhiệm vụ của bạn là phân tích hình ảnh từ camera giao thông và trích xuất biển số xe.
Nếu thấy biển số, hãy trả về số sê-ri của biển số đó (ví dụ: 29A-12345).
Nếu không thấy biển số nào rõ ràng, hãy trả về null.
Luôn trả về kết quả dưới dạng JSON.
`;

export async function detectLicensePlate(base64Image: string): Promise<DetectionResult> {
  if (!base64Image || base64Image.length < 100) {
    console.warn("Invalid image data received");
    return { plate: null, confidence: 0 };
  }

  try {
    console.log(`Sending image to Gemini... (Size: ${Math.round(base64Image.length / 1024)} KB)`);
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            { text: "Trích xuất biển số xe từ hình ảnh này." },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Image,
              },
            },
          ],
        },
      ],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            plate: {
              type: Type.STRING,
              description: "Số biển số xe tìm thấy hoặc null nếu không thấy.",
            },
            confidence: {
              type: Type.NUMBER,
              description: "Độ tin cậy của kết quả từ 0 đến 1.",
            },
          },
          required: ["plate", "confidence"],
        },
      },
    });

    const result = JSON.parse(response.text);
    return {
      plate: result.plate && result.plate !== "null" ? result.plate : null,
      confidence: result.confidence || 0,
    };
  } catch (error) {
    console.error("Error detecting license plate:", error);
    return { plate: null, confidence: 0 };
  }
}
