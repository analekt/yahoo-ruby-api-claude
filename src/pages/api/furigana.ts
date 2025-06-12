import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { FuriganaResponse, FuriganaErrorResponse, GradeLevel } from '@/types';

const API_URL = 'https://jlp.yahooapis.jp/FuriganaService/V2/furigana';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // POSTリクエストのみ許可
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { text, clientId, grade } = req.body;

    // 必須パラメータのチェック
    if (!text || !clientId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Yahoo APIにリクエスト
    const response = await axios.post<FuriganaResponse | FuriganaErrorResponse>(
      API_URL,
      {
        id: Date.now().toString(),
        jsonrpc: '2.0',
        method: 'jlp.furiganaservice.furigana',
        params: {
          q: text,
          grade: grade || 1
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Yahoo AppID: ' + clientId,
        }
      }
    );

    const data = response.data;
    
    // エラーレスポンスの場合
    if ('error' in data) {
      const errorResponse = data as FuriganaErrorResponse;
      return res.status(400).json({ 
        error: `API Error: ${errorResponse.error.message} (Code: ${errorResponse.error.code})`
      });
    }
    
    return res.status(200).json(data);
  } catch (error: any) {
    console.error('Error calling Yahoo API:', error);
    
    // エラーレスポンスを返す
    return res.status(500).json({ 
      error: error.message || 'Internal Server Error',
      details: error.response?.data || {} 
    });
  }
} 