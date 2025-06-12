import { 
  requestFurigana, 
  splitTextIntoChunks, 
  applyInkBracketRuby, 
  applyXhtmlRuby 
} from './furiganaApi';
import { FuriganaResponse, GradeLevel, RubyStyle, Word } from '@/types';

// 既に処理した漢字とその漢字をスキップする残り文字数を管理する型
interface SkipInfo {
  [kanji: string]: number;
}

// ルビ振り処理を行うクラス
export class FuriganaProcessor {
  private skipInfo: SkipInfo = {};
  private skipLength: number;
  private rubyStyle: RubyStyle;
  private grade: GradeLevel;
  private clientId: string;

  constructor(clientId: string, skipLength: number, grade: GradeLevel, rubyStyle: RubyStyle) {
    this.clientId = clientId;
    this.skipLength = skipLength;
    this.grade = grade;
    this.rubyStyle = rubyStyle;
    this.skipInfo = {};
  }

  // ルビを適用する処理
  public async process(text: string): Promise<string> {
    // テキストを4KB以内のチャンクに分割
    const chunks = splitTextIntoChunks(text);
    let result = '';
    
    // 各チャンクを処理
    for (const chunk of chunks) {
      // チャンクに改頁マークが含まれている場合、スキップ情報をリセット
      if (chunk.includes('｛改頁｝')) {
        const parts = chunk.split('｛改頁｝');
        for (let i = 0; i < parts.length; i++) {
          const part = parts[i];
          if (part) {
            const processedPart = await this.processChunk(part);
            result += processedPart;
          }
          
          // 改頁マークを追加（最後のパートを除く）
          if (i < parts.length - 1) {
            result += '｛改頁｝';
            this.skipInfo = {}; // スキップ情報をリセット
          }
        }
      } else {
        // 通常のチャンクを処理
        const processedChunk = await this.processChunk(chunk);
        result += processedChunk;
      }
    }
    
    return result;
  }

  // 個々のチャンクを処理する内部メソッド
  private async processChunk(chunk: string): Promise<string> {
    try {
      // APIリクエストを送信
      const response = await requestFurigana(chunk, this.clientId, this.grade);
      
      // レスポンスからルビを適用
      return this.applyRubyFromResponse(response, chunk);
    } catch (error) {
      // エラーが発生した場合は元のテキストを返す
      console.error('Failed to process chunk:', error);
      return chunk;
    }
  }

  // レスポンスからルビを適用する内部メソッド
  private applyRubyFromResponse(response: FuriganaResponse, originalText: string): string {
    const words = response.result.word;
    let result = '';
    let currentPos = 0;
    
    for (const word of words) {
      // 単語にルビを適用
      const processedWord = this.applyRubyToWord(word);
      
      // 元のテキスト内の位置を特定し、間のテキストを追加
      const startPos = originalText.indexOf(word.surface, currentPos);
      if (startPos > currentPos) {
        result += originalText.substring(currentPos, startPos);
      }
      
      // 処理した単語を追加
      result += processedWord;
      currentPos = startPos + word.surface.length;
    }
    
    // 残りのテキストを追加
    if (currentPos < originalText.length) {
      result += originalText.substring(currentPos);
    }
    
    return result;
  }

  // 単語にルビを適用する内部メソッド
  private applyRubyToWord(word: Word): string {
    // ふりがながない場合はそのまま返す
    if (!word.furigana) {
      return word.surface;
    }
    
    // subwordがある場合は個別に処理
    if (word.subword && word.subword.length > 0) {
      let result = '';
      let currentPos = 0;
      
      for (const subword of word.subword) {
        // サブワードの位置を特定
        const startPos = word.surface.indexOf(subword.surface, currentPos);
        
        // 間のテキストを追加
        if (startPos > currentPos) {
          result += word.surface.substring(currentPos, startPos);
        }
        
        // サブワードにルビを適用
        if (subword.furigana) {
          // スキップ処理を適用
          const shouldSkip = this.shouldSkipRuby(subword.surface);
          
          if (shouldSkip) {
            result += subword.surface;
          } else {
            // 選択されたスタイルでルビを適用
            if (this.rubyStyle === '墨つき括弧') {
              result += applyInkBracketRuby(subword.surface, subword.furigana);
            } else {
              result += applyXhtmlRuby(subword.surface, subword.furigana);
            }
            
            // スキップ情報を更新
            this.updateSkipInfo(subword.surface);
          }
        } else {
          result += subword.surface;
        }
        
        currentPos = startPos + subword.surface.length;
      }
      
      // 残りのテキストを追加
      if (currentPos < word.surface.length) {
        result += word.surface.substring(currentPos);
      }
      
      return result;
    } else {
      // 単語全体に対してルビを適用
      const shouldSkip = this.shouldSkipRuby(word.surface);
      
      if (shouldSkip) {
        return word.surface;
      }
      
      // 選択されたスタイルでルビを適用
      let result = '';
      if (this.rubyStyle === '墨つき括弧') {
        result = applyInkBracketRuby(word.surface, word.furigana);
      } else {
        result = applyXhtmlRuby(word.surface, word.furigana);
      }
      
      // スキップ情報を更新
      this.updateSkipInfo(word.surface);
      
      return result;
    }
  }

  // 漢字をスキップすべきかどうかを判定
  private shouldSkipRuby(surface: string): boolean {
    // 漢字を含まない場合はスキップする必要なし
    if (!/[\u4e00-\u9faf]/.test(surface)) {
      return false;
    }
    
    // 各漢字についてスキップ情報をチェック
    for (let i = 0; i < surface.length; i++) {
      const char = surface[i];
      if (/[\u4e00-\u9faf]/.test(char) && this.skipInfo[char] && this.skipInfo[char] > 0) {
        return true;
      }
    }
    
    return false;
  }

  // スキップ情報を更新
  private updateSkipInfo(surface: string): void {
    // スキップ長が0の場合は何もしない
    if (this.skipLength <= 0) {
      return;
    }
    
    // 漢字を抽出してスキップ情報を更新
    for (let i = 0; i < surface.length; i++) {
      const char = surface[i];
      if (/[\u4e00-\u9faf]/.test(char)) {
        this.skipInfo[char] = this.skipLength;
      }
    }
  }

  // 文字数を減少させる（各処理後に呼び出す）
  public decrementSkipCounts(): void {
    for (const key in this.skipInfo) {
      if (this.skipInfo[key] > 0) {
        this.skipInfo[key]--;
      }
    }
  }
} 