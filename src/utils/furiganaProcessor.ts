import { 
  requestFurigana, 
  splitTextIntoChunks, 
  applyInkBracketRuby, 
  applyXhtmlRuby 
} from './furiganaApi';
import { FuriganaResponse, GradeLevel, RubyStyle, Word } from '@/types';

// APIアクセスを監視するフラグ
const DEBUG_API_CALLS = true;

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
    
    console.log(`FuriganaProcessor initialized with: grade=${grade}, skipLength=${skipLength}, rubyStyle=${rubyStyle}`);
    console.log(`ClientID: ${clientId.substring(0, 3)}***${clientId.substring(clientId.length - 3)}`);
  }

  // ルビを適用する処理
  public async process(text: string): Promise<string> {
    console.log(`Processing text of length ${text.length}`);
    
    if (DEBUG_API_CALLS) {
      console.log('API access mode: Server-side API endpoint');
    }
    
    // テキストを4KB以内のチャンクに分割
    const chunks = splitTextIntoChunks(text);
    console.log(`Text split into ${chunks.length} chunks`);
    
    let result = '';
    
    // 各チャンクを処理
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`Processing chunk ${i+1}/${chunks.length} (length: ${chunk.length})`);
      
      // チャンクに改頁マークが含まれている場合、スキップ情報をリセット
      if (chunk.includes('｛改頁｝')) {
        console.log(`Chunk ${i+1} contains page break, resetting skip info`);
        const parts = chunk.split('｛改頁｝');
        for (let j = 0; j < parts.length; j++) {
          const part = parts[j];
          if (part) {
            try {
              const processedPart = await this.processChunk(part);
              result += processedPart;
            } catch (error) {
              console.error(`Error processing part ${j+1} of chunk ${i+1}:`, error);
              result += part; // エラー時は元のテキストを使用
            }
          }
          
          // 改頁マークを追加（最後のパートを除く）
          if (j < parts.length - 1) {
            result += '｛改頁｝';
            this.skipInfo = {}; // スキップ情報をリセット
          }
        }
      } else {
        // 通常のチャンクを処理
        try {
          const processedChunk = await this.processChunk(chunk);
          result += processedChunk;
        } catch (error) {
          console.error(`Error processing chunk ${i+1}:`, error);
          // エラーが発生しても処理を継続し、元のテキストを使用
          result += chunk;
        }
      }
    }
    
    console.log(`Text processing complete, result length: ${result.length}`);
    return result;
  }

  // 個々のチャンクを処理する内部メソッド
  private async processChunk(chunk: string): Promise<string> {
    if (chunk.trim().length === 0) {
      console.log('Skipping empty chunk');
      return chunk;
    }

    try {
      // APIリクエストを送信
      console.log(`Sending API request for chunk of length ${chunk.length}`);
      
      // シンプルなリクエストでAPIをテスト
      let testResult = null;
      try {
        console.log('Testing API with simple request...');
        const response = await fetch('/api/furigana', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: '漢字',
            clientId: this.clientId,
            grade: this.grade
          })
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('API test failed:', response.status, errorText);
        } else {
          testResult = await response.json();
          console.log('API test successful:', testResult);
        }
      } catch (testError) {
        console.error('API test error:', testError);
      }
      
      // メインのAPIリクエスト
      console.log('Sending main API request');
      const response = await requestFurigana(chunk, this.clientId, this.grade);
      
      console.log(`API response received, word count: ${response.result.word.length}`);
      
      // レスポンスからルビを適用
      return this.applyRubyFromResponse(response, chunk);
    } catch (error: any) {
      // エラーが発生した場合は元のテキストを返す
      console.error('Failed to process chunk:', error);
      throw new Error(`Chunk processing failed: ${error.message}`);
    }
  }

  // レスポンスからルビを適用する内部メソッド
  private applyRubyFromResponse(response: FuriganaResponse, originalText: string): string {
    const words = response.result.word;
    let result = '';
    let currentPos = 0;
    
    console.log(`Applying ruby to ${words.length} words`);
    
    for (const word of words) {
      // 単語にルビを適用
      const processedWord = this.applyRubyToWord(word);
      
      // 元のテキスト内の位置を特定し、間のテキストを追加
      const startPos = originalText.indexOf(word.surface, currentPos);
      if (startPos === -1) {
        console.warn(`Could not find word '${word.surface}' in original text at position ${currentPos}+`);
        continue;
      }
      
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
        if (startPos === -1) {
          console.warn(`Could not find subword '${subword.surface}' in word '${word.surface}' at position ${currentPos}+`);
          continue;
        }
        
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