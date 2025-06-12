import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { FuriganaResponse, FuriganaErrorResponse, GradeLevel } from '@/types';

const API_URL = 'https://jlp.yahooapis.jp/FuriganaService/V2/furigana';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // CORSヘッダーを設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // OPTIONSリクエストに対応
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // POSTリクエストのみ許可
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    console.log('API Request received:', JSON.stringify(req.body).substring(0, 100) + '...');
    
    const { text, clientId, grade } = req.body;

    // 必須パラメータのチェック
    if (!text || !clientId) {
      console.log('Missing parameters:', { hasText: !!text, hasClientId: !!clientId });
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    console.log('Preparing Yahoo API request with grade:', grade);
    
    // Yahoo APIにリクエスト
    try {
      const yahooRequestData = {
        id: Date.now().toString(),
        jsonrpc: '2.0',
        method: 'jlp.furiganaservice.furigana',
        params: {
          q: text,
          grade: grade || 1
        }
      };
      
      console.log('Yahoo API request payload:', JSON.stringify(yahooRequestData).substring(0, 100) + '...');
      
      // fetch APIを使用
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': `Yahoo AppID: ${clientId}`,
        },
        body: JSON.stringify(yahooRequestData),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Yahoo API error: ${response.status} ${response.statusText}`, errorText);
        return res.status(response.status).json({
          error: `Yahoo API Error: ${response.status} ${response.statusText}`,
          details: errorText
        });
      }
      
      const data = await response.json();

      console.log('Yahoo API response status:', response.status);
      
      // エラーレスポンスの場合
      if ('error' in data) {
        const errorResponse = data as FuriganaErrorResponse;
        console.log('Yahoo API returned error:', errorResponse.error);
        return res.status(400).json({ 
          error: `API Error: ${errorResponse.error.message} (Code: ${errorResponse.error.code})`
        });
      }
      
      console.log('Yahoo API success, word count:', (data as FuriganaResponse).result.word.length);
      return res.status(200).json(data);
    } catch (apiError: any) {
      console.error('Error calling Yahoo API:', apiError);
      console.error('Error details:', apiError.response?.data || 'No response data');
      console.error('Status:', apiError.response?.status || 'No status');
      
      // エラーレスポンスを返す
      return res.status(500).json({ 
        error: 'Error calling Yahoo API: ' + (apiError.message || 'Unknown error'),
        details: {
          status: apiError.response?.status,
          data: apiError.response?.data,
          message: apiError.message,
          stack: process.env.NODE_ENV === 'development' ? apiError.stack : undefined
        }
      });
    }
  } catch (error: any) {
    console.error('General server error:', error);
    
    // エラーレスポンスを返す
    return res.status(500).json({ 
      error: error.message || 'Internal Server Error',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
} 