import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { FuriganaResponse, FuriganaErrorResponse, GradeLevel } from '@/types';

// Yahoo!ルビ振りAPIのURL
const YAHOO_API_URL = 'https://jlp.yahooapis.jp/FuriganaService/V2/furigana';

// レスポンスの型定義
type ApiResponse = {
  result?: any;
  error?: string;
  status?: number;
  details?: string;
  message?: string;
  timestamp?: string;
  version?: string;
  query?: any;
  headers?: any;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  console.log('API route handler called: /api/furigana');
  
  // CORSヘッダーを設定 - '*'ではなく具体的なオリジンを設定
  const origin = req.headers.origin || '';
  const allowedOrigins = [
    'https://yahoo-ruby-api-claude.vercel.app',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ];
  
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    // 開発環境用にワイルドカードを許可
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // OPTIONSリクエストはここで終了
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // GETリクエストの処理（テスト用）
  if (req.method === 'GET') {
    // テスト用のシンプルなレスポンス
    res.status(200).json({
      status: 200,
      message: 'Yahoo Furigana API endpoint is working',
      timestamp: new Date().toISOString(),
      version: '1.0.2', // バージョン更新
      query: req.query,
      headers: {
        origin: req.headers.origin || 'no-origin'
      }
    });
    return;
  }
  
  // POSTメソッド以外は受け付けない
  if (req.method !== 'POST') {
    console.error('Invalid method:', req.method);
    res.status(405).json({ error: 'Method Not Allowed', status: 405 });
    return;
  }
  
  try {
    // リクエストボディからデータを取得
    const { text, clientId, grade = "1" as GradeLevel } = req.body;
    
    // キャッシュを無効化するヘッダーを設定
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    
    // 必須パラメータの検証
    if (!text) {
      console.error('Missing required parameter: text');
      res.status(400).json({ error: 'Missing required parameter: text', status: 400 });
      return;
    }
    
    if (!clientId) {
      console.error('Missing required parameter: clientId');
      res.status(400).json({ error: 'Missing required parameter: clientId', status: 400 });
      return;
    }
    
    // GradeLevelから数値に変換
    const gradeNumber = parseInt(grade, 10);
    
    // リクエストデータ
    const requestData = {
      id: '1234-1',
      jsonrpc: '2.0',
      method: 'jlp.furiganaservice.furigana',
      params: {
        q: text,
        grade: gradeNumber,
      },
    };
    
    console.log(`Sending request to Yahoo API for text of length ${text.length}, grade: ${grade}`);
    console.log(`Request data: ${JSON.stringify(requestData).substring(0, 100)}...`);
    console.log(`API URL: ${YAHOO_API_URL}`);
    console.log(`Client ID first 5 chars: ${clientId.substring(0, 5)}...`);
    
    // Yahoo!のAPIにリクエストを送信
    const response = await axios.post(YAHOO_API_URL, requestData, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Yahoo AppID: ' + clientId,
      },
      timeout: 10000, // 10秒のタイムアウト
    });
    
    console.log(`Yahoo API response received: status ${response.status}`);
    
    // 応答データをクライアントに返す
    res.status(200).json({
      result: response.data.result,
      status: 200,
    });
  } catch (error: any) {
    console.error('Error processing request:', error);
    
    // エラーの詳細情報を取得
    let errorMessage = 'Internal Server Error';
    let statusCode = 500;
    let errorDetails = '';
    
    if (error.response) {
      // サーバーからのレスポンスがある場合
      statusCode = error.response.status;
      errorMessage = `Yahoo API Error: ${statusCode}`;
      try {
        errorDetails = JSON.stringify(error.response.data);
      } catch (e) {
        errorDetails = error.response.data || error.message;
      }
      console.error('API response error:', statusCode, errorDetails);
    } else if (error.request) {
      // リクエストは送信されたがレスポンスがない場合
      errorMessage = 'No response from Yahoo API';
      errorDetails = error.message;
      console.error('No response from API:', error.request);
    } else {
      // リクエスト設定中にエラーが発生した場合
      errorMessage = error.message || 'Request configuration error';
      console.error('Request error:', error.message);
    }
    
    // エラーレスポンスを返す
    res.status(statusCode).json({
      error: errorMessage,
      status: statusCode,
      details: errorDetails,
    });
  }
} 