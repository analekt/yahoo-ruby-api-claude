import axios from 'axios';
import { FuriganaResponse, FuriganaErrorResponse, GradeLevel } from '@/types';

const API_URL = 'https://jlp.yahooapis.jp/FuriganaService/V2/furigana';

// テキストを4KB以内のチャンクに分割する関数
export const splitTextIntoChunks = (text: string): string[] => {
  const MAX_CHUNK_SIZE = 4000; // 4KBより少し小さくする
  const chunks: string[] = [];
  let currentChunk = '';
  
  // テキストを行に分割
  const lines = text.split('\n');
  
  for (const line of lines) {
    // 改頁記号が含まれている場合は、現在のチャンクを終了して新しいチャンクを開始
    if (line.includes('｛改頁｝')) {
      const [beforePageBreak, ...afterPageBreak] = line.split('｛改頁｝');
      
      if (beforePageBreak) {
        if (currentChunk.length + beforePageBreak.length > MAX_CHUNK_SIZE) {
          // 改頁前のテキストを追加する前にチャンクサイズをチェック
          chunks.push(currentChunk);
          currentChunk = beforePageBreak;
        } else {
          currentChunk += (currentChunk ? '\n' : '') + beforePageBreak;
        }
      }
      
      // 現在のチャンクを終了し、新しいチャンクを開始
      if (currentChunk) {
        chunks.push(currentChunk);
        currentChunk = '';
      }
      
      // 改頁後のテキストを処理
      const afterPageBreakText = afterPageBreak.join('｛改頁｝');
      if (afterPageBreakText) {
        currentChunk = afterPageBreakText;
      }
      
      continue;
    }
    
    // 行が大きすぎる場合は、句読点、括弧、アルファベットで分割
    if (line.length > MAX_CHUNK_SIZE) {
      const segments = line.split(/([.。,、!！?？\(\)（）\[\]「」『』])/);
      
      for (const segment of segments) {
        if (currentChunk.length + segment.length > MAX_CHUNK_SIZE) {
          chunks.push(currentChunk);
          currentChunk = segment;
        } else {
          currentChunk += (currentChunk ? '' : '') + segment;
        }
      }
    } else if (currentChunk.length + line.length > MAX_CHUNK_SIZE) {
      // 現在のチャンクに行を追加するとサイズを超える場合
      chunks.push(currentChunk);
      currentChunk = line;
    } else {
      // 行を現在のチャンクに追加
      currentChunk += (currentChunk ? '\n' : '') + line;
    }
  }
  
  // 最後のチャンクを追加
  if (currentChunk) {
    chunks.push(currentChunk);
  }
  
  return chunks;
};

// APIリクエストを送信する関数
export const requestFurigana = async (
  text: string,
  clientId: string,
  grade: GradeLevel
): Promise<FuriganaResponse> => {
  try {
    const response = await axios.post<FuriganaResponse | FuriganaErrorResponse>(
      API_URL,
      {
        id: Date.now().toString(),
        jsonrpc: '2.0',
        method: 'jlp.furiganaservice.furigana',
        params: {
          q: text,
          grade
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
      throw new Error(`API Error: ${errorResponse.error.message} (Code: ${errorResponse.error.code})`);
    }
    
    return data as FuriganaResponse;
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Network Error: ${error.message}`);
    }
    throw error;
  }
};

// 単語に墨付き括弧スタイルのルビを適用
export const applyInkBracketRuby = (word: string, furigana: string): string => {
  if (!furigana || word === furigana) return word;
  
  // 漢字部分とそれ以外を分ける
  let result = '';
  let kanjiIndex = 0;
  
  for (let i = 0; i < word.length; i++) {
    const char = word[i];
    // 漢字かどうかを判定（簡易的な判定）
    const isKanji = /[\u4e00-\u9faf]/.test(char);
    
    if (isKanji) {
      // 対応するふりがなを取得
      if (kanjiIndex < furigana.length) {
        result += `${char}【${furigana[kanjiIndex]}】`;
        kanjiIndex++;
      } else {
        result += char;
      }
    } else {
      result += char;
    }
  }
  
  return result;
};

// 単語にXHTMLスタイルのルビを適用
export const applyXhtmlRuby = (word: string, furigana: string): string => {
  if (!furigana || word === furigana) return word;
  
  // 漢字部分とそれ以外を分ける
  let result = '';
  let kanjiIndex = 0;
  
  for (let i = 0; i < word.length; i++) {
    const char = word[i];
    // 漢字かどうかを判定（簡易的な判定）
    const isKanji = /[\u4e00-\u9faf]/.test(char);
    
    if (isKanji) {
      // 対応するふりがなを取得
      if (kanjiIndex < furigana.length) {
        result += `<ruby>${char}<rt>${furigana[kanjiIndex]}</rt></ruby>`;
        kanjiIndex++;
      } else {
        result += char;
      }
    } else {
      result += char;
    }
  }
  
  return result;
}; 