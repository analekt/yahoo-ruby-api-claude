import { FuriganaResponse, GradeLevel } from '@/types';

// APIエンドポイントの完全なURLを取得する関数
function getApiUrl(path: string): string {
  // ブラウザ環境でなければ相対パスを返す
  if (typeof window === 'undefined') {
    return path;
  }
  
  // 現在のURL情報から基本URLを取得
  const baseUrl = window.location.origin;
  
  // パスが /api で始まっていない場合は追加
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const apiPath = normalizedPath.startsWith('/api') ? normalizedPath : `/api${normalizedPath}`;
  
  return `${baseUrl}${apiPath}`;
}

/**
 * Yahoo!デベロッパーネットワークのルビ振りAPIにリクエストを送信する
 * 
 * @param text ルビを振りたいテキスト
 * @param clientId Yahoo!デベロッパーネットワークのアプリケーションID
 * @param grade 学年レベル（1-8）
 * @returns APIレスポンス
 */
export async function requestFurigana(
  text: string, 
  clientId: string, 
  grade: GradeLevel
): Promise<FuriganaResponse> {
  try {
    console.log(`Sending request to server-side API endpoint with text length: ${text.length}`);
    console.time('apiRequest');
    
    // サーバーサイドのAPIエンドポイントを使用
    const apiPath = getApiUrl('/api/furigana');
    console.log(`Using API path: ${apiPath}`);
    
    const response = await fetch(apiPath, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
      body: JSON.stringify({
        text,
        clientId,
        grade
      }),
    });
    
    console.timeEnd('apiRequest');
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API request failed: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('API response successfully received and parsed');
    return data;
  } catch (error: any) {
    console.error('Error in requestFurigana:', error);
    throw new Error(`Failed to request furigana: ${error.message}`);
  }
}

/**
 * テキストを4KB以内のチャンクに分割する
 * 
 * @param text 分割するテキスト
 * @param maxLength 最大バイト長（デフォルト4000バイト）
 * @returns 分割されたテキストの配列
 */
export function splitTextIntoChunks(text: string, maxLength: number = 4000): string[] {
  const chunks: string[] = [];
  let currentChunk = '';
  let currentLength = 0;
  
  // 文字ごとに処理
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const charLength = new TextEncoder().encode(char).length;
    
    // チャンクが最大長を超える場合、新しいチャンクを開始
    if (currentLength + charLength > maxLength) {
      chunks.push(currentChunk);
      currentChunk = '';
      currentLength = 0;
    }
    
    // 文字を現在のチャンクに追加
    currentChunk += char;
    currentLength += charLength;
  }
  
  // 最後のチャンクを追加
  if (currentChunk) {
    chunks.push(currentChunk);
  }
  
  return chunks;
}

/**
 * 墨つき括弧スタイルでルビを適用する
 * 
 * @param surface 表層文字列
 * @param furigana ふりがな
 * @returns ルビが適用されたテキスト
 */
export function applyInkBracketRuby(surface: string, furigana: string): string {
  return `${surface}《${furigana}》`;
}

/**
 * XHTML形式でルビを適用する
 * 
 * @param surface 表層文字列
 * @param furigana ふりがな
 * @returns ルビが適用されたテキスト
 */
export function applyXhtmlRuby(surface: string, furigana: string): string {
  return `<ruby>${surface}<rt>${furigana}</rt></ruby>`;
} 