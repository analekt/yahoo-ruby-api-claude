// APIレスポンスの型定義
export interface SubWord {
  surface: string;
  furigana?: string;
  roman?: string;
}

export interface Word {
  surface: string;
  furigana?: string;
  roman?: string;
  subword?: SubWord[];
}

export interface FuriganaResult {
  word: Word[];
}

export interface FuriganaResponse {
  id: string | number;
  jsonrpc: string;
  result: FuriganaResult;
}

export interface FuriganaErrorResponse {
  id: string | number | null;
  jsonrpc: string;
  error: {
    code: number;
    message: string;
  };
}

// アプリケーション状態の型定義
export type RubyStyle = '墨つき括弧' | 'XHTML';
export type GradeLevel = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8';
export type Status = 'idle' | 'loading' | 'success' | 'error';

export interface AppState {
  clientId: string;
  skipLength: number;
  rubyStyle: RubyStyle;
  grade: GradeLevel;
  inputText: string;
  outputText: string;
  isProcessing: boolean;
  saveClientId: boolean;
  debugInfo: string;
  showDebug: boolean;
  status: Status;
  error: string | null;
}

// 処理状態の型定義
export enum Status {
  IDLE = 'idle',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  ERROR = 'error'
} 