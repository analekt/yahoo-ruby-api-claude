import { useState, useEffect } from 'react';
import Head from 'next/head';
import { FuriganaProcessor } from '@/utils/furiganaProcessor';
import { AppState, GradeLevel, RubyStyle, Status } from '@/types';

// 学年選択肢の定義
const GRADE_OPTIONS = [
  { value: 1, label: '小学1年生向け。漢字にふりがなを付けます。' },
  { value: 2, label: '小学2年生向け。1年生で習う漢字にはふりがなを付けません。' },
  { value: 3, label: '小学3年生向け。1～2年生で習う漢字にはふりがなを付けません。' },
  { value: 4, label: '小学4年生向け。1～3年生で習う漢字にはふりがなを付けません。' },
  { value: 5, label: '小学5年生向け。1～4年生で習う漢字にはふりがなを付けません。' },
  { value: 6, label: '小学6年生向け。1～5年生で習う漢字にはふりがなを付けません。' },
  { value: 7, label: '中学生以上向け。小学校で習う漢字にはふりがなを付けません。' },
  { value: 8, label: '一般向け。常用漢字にはふりがなを付けません。' },
];

// ルビスタイルの選択肢
const RUBY_STYLE_OPTIONS = [
  { value: '墨つき括弧', label: '墨つき括弧 (例: 漢字【かん】字)' },
  { value: 'XHTML', label: 'XHTML (例: <ruby>漢<rt>かん</rt></ruby>字)' },
];

export default function Home() {
  // アプリケーションの状態
  const [state, setState] = useState<AppState>({
    input: '',
    output: '',
    clientId: '',
    rememberClientId: false,
    skipLength: 100,
    grade: 1 as GradeLevel,
    rubyStyle: '墨つき括弧' as RubyStyle,
    status: 'idle' as Status,
    error: null,
  });
  
  // デバッグ情報
  const [debug, setDebug] = useState<{
    apiResponse: any | null;
    processingSteps: string[];
  }>({
    apiResponse: null,
    processingSteps: [],
  });

  // LocalStorageからClientIDを読み込む
  useEffect(() => {
    const storedClientId = localStorage.getItem('yahooClientId');
    if (storedClientId) {
      setState((prev: AppState) => ({ ...prev, clientId: storedClientId }));
    }
  }, []);

  // ClientIDを保存する
  const saveClientId = () => {
    if (state.rememberClientId && state.clientId) {
      localStorage.setItem('yahooClientId', state.clientId);
    } else {
      localStorage.removeItem('yahooClientId');
    }
  };

  // 入力値の変更を処理
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'grade') {
      setState((prev: AppState) => ({ ...prev, [name]: parseInt(value) as GradeLevel }));
    } else if (name === 'skipLength') {
      setState((prev: AppState) => ({ ...prev, [name]: parseInt(value) || 0 }));
    } else {
      setState((prev: AppState) => ({ ...prev, [name]: value }));
    }
  };

  // チェックボックスの変更を処理
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setState((prev: AppState) => ({ ...prev, [name]: checked }));
    
    if (name === 'rememberClientId') {
      if (checked && state.clientId) {
        localStorage.setItem('yahooClientId', state.clientId);
      } else if (!checked) {
        localStorage.removeItem('yahooClientId');
      }
    }
  };

  // ルビ振り処理
  const processText = async () => {
    // デバッグ情報をリセット
    setDebug({
      apiResponse: null,
      processingSteps: ['処理開始...'],
    });
    
    // 入力チェック
    if (!state.input.trim()) {
      setState((prev: AppState) => ({ ...prev, error: '入力テキストが必要です。', status: 'error' }));
      return;
    }

    if (!state.clientId.trim()) {
      setState((prev: AppState) => ({ ...prev, error: 'Client IDが必要です。', status: 'error' }));
      return;
    }

    // 処理開始
    setState((prev: AppState) => ({ ...prev, status: 'loading', error: null }));
    
    try {
      // ClientIDを保存
      saveClientId();
      
      setDebug(prev => ({
        ...prev,
        processingSteps: [...prev.processingSteps, 'Client ID保存完了']
      }));
      
      // API動作確認のためのシンプルなテスト
      try {
        const testResponse = await fetch('/api/furigana', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: '漢字',
            clientId: state.clientId,
            grade: state.grade
          })
        });
        
        const testData = await testResponse.json();
        
        setDebug(prev => ({
          ...prev,
          apiResponse: testData,
          processingSteps: [...prev.processingSteps, 'API接続テスト完了', 
                            `APIレスポンス: ${JSON.stringify(testData).substring(0, 200)}...`]
        }));
      } catch (testError: any) {
        setDebug(prev => ({
          ...prev,
          processingSteps: [...prev.processingSteps, `API接続テスト失敗: ${testError.message || '不明なエラー'}`]
        }));
      }
      
      // FuriganaProcessorのインスタンスを作成
      const processor = new FuriganaProcessor(
        state.clientId,
        state.skipLength,
        state.grade,
        state.rubyStyle
      );
      
      setDebug(prev => ({
        ...prev,
        processingSteps: [...prev.processingSteps, 'FuriganaProcessorインスタンス作成完了']
      }));
      
      // テキスト処理
      setDebug(prev => ({
        ...prev,
        processingSteps: [...prev.processingSteps, 'テキスト処理開始...']
      }));
      
      const result = await processor.process(state.input);
      
      setDebug(prev => ({
        ...prev,
        processingSteps: [...prev.processingSteps, 'テキスト処理完了', `結果長: ${result.length}文字`]
      }));
      
      // 結果を設定
      setState((prev: AppState) => ({ 
        ...prev, 
        output: result, 
        status: 'success', 
        error: null 
      }));
    } catch (error: any) {
      console.error('Processing error:', error);
      
      setDebug(prev => ({
        ...prev,
        processingSteps: [...prev.processingSteps, `エラー発生: ${error.message || '不明なエラー'}`]
      }));
      
      setState((prev: AppState) => ({ 
        ...prev, 
        status: 'error', 
        error: error instanceof Error ? error.message : '不明なエラーが発生しました。' 
      }));
    }
  };

  // 結果をクリップボードにコピー
  const copyToClipboard = () => {
    if (state.output) {
      navigator.clipboard.writeText(state.output)
        .then(() => {
          alert('結果をクリップボードにコピーしました。');
        })
        .catch(err => {
          console.error('クリップボードへのコピーに失敗しました:', err);
          setState((prev: AppState) => ({ ...prev, error: 'クリップボードへのコピーに失敗しました。', status: 'error' }));
        });
    }
  };

  // ステータスバーのスタイルを決定
  const getStatusBarClass = () => {
    switch (state.status) {
      case 'loading': return 'status-bar status-loading';
      case 'success': return 'status-bar status-success';
      case 'error': return 'status-bar status-error';
      default: return 'status-bar status-idle';
    }
  };

  // ステータスメッセージを取得
  const getStatusMessage = () => {
    switch (state.status) {
      case 'loading': return '処理中...';
      case 'success': return '処理完了！';
      case 'error': return `エラー: ${state.error}`;
      default: return '待機中';
    }
  };

  return (
    <>
      <Head>
        <title>Yahoo! ルビ振りAPI</title>
        <meta name="description" content="Yahoo!のルビ振りAPIを使用して、テキストにふりがなを付けるツール" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="container">
        <header className="py-6">
          <h1 className="text-3xl font-bold text-center mb-2">Yahoo! ルビ振りAPI</h1>
          <p className="text-center text-gray-600">漢字かな交じり文に、ふりがな（ルビ）を付けます。</p>
        </header>

        <main>
          <div className="card mb-6">
            <h2 className="text-xl font-semibold mb-4">入力設定</h2>
            
            <div className="mb-4">
              <label htmlFor="clientId" className="label">Client ID (アプリケーションID)</label>
              <input
                type="text"
                id="clientId"
                name="clientId"
                value={state.clientId}
                onChange={handleChange}
                className="input-field"
                placeholder="Yahoo! Developer NetworkのアプリケーションID"
              />
              <div className="mt-2">
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    name="rememberClientId"
                    checked={state.rememberClientId}
                    onChange={handleCheckboxChange}
                    className="mr-2"
                  />
                  <span className="text-sm">Client IDをブラウザに記憶する</span>
                </label>
              </div>
            </div>
            
            <div className="mb-4">
              <label htmlFor="skipLength" className="label">ルビをスキップする文字数</label>
              <input
                type="number"
                id="skipLength"
                name="skipLength"
                value={state.skipLength}
                onChange={handleChange}
                className="input-field"
                min="0"
                placeholder="同じ漢字をスキップする文字数"
              />
              <p className="text-sm text-gray-500 mt-1">
                一度ルビを付与した漢字が、続く設定文字数内で再登場した場合、ルビを付与しません。
                「｛改頁｝」という文字列が現れると、スキップカウントはリセットされます。
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="grade" className="label">ルビを付与する基準</label>
                <select
                  id="grade"
                  name="grade"
                  value={state.grade}
                  onChange={handleChange}
                  className="select-field"
                >
                  {GRADE_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="rubyStyle" className="label">ルビのスタイル</label>
                <select
                  id="rubyStyle"
                  name="rubyStyle"
                  value={state.rubyStyle}
                  onChange={handleChange}
                  className="select-field"
                >
                  {RUBY_STYLE_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="mb-4">
              <label htmlFor="input" className="label">ルビを付与するテキスト</label>
              <textarea
                id="input"
                name="input"
                value={state.input}
                onChange={handleChange}
                className="input-field h-40"
                placeholder="ルビを付与したいテキストを入力してください"
              />
            </div>
            
            <button
              onClick={processText}
              className="btn w-full"
              disabled={state.status === 'loading'}
            >
              ルビをふる
            </button>
          </div>
          
          {/* ステータスバー */}
          <div className={getStatusBarClass()}>
            {getStatusMessage()}
          </div>

          {/* 出力エリア */}
          {state.output && (
            <div className="card mt-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">出力結果</h2>
                <button
                  onClick={copyToClipboard}
                  className="btn-secondary text-sm"
                >
                  結果をコピー
                </button>
              </div>
              
              <div className="border p-4 rounded bg-gray-50 whitespace-pre-wrap">
                {state.rubyStyle === 'XHTML' ? (
                  <div dangerouslySetInnerHTML={{ __html: state.output }} />
                ) : (
                  state.output
                )}
              </div>
              
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="grade-output" className="label">ルビ付与基準を変更</label>
                  <select
                    id="grade-output"
                    name="grade"
                    value={state.grade}
                    onChange={handleChange}
                    className="select-field"
                  >
                    {GRADE_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label htmlFor="rubyStyle-output" className="label">ルビスタイルを変更</label>
                  <select
                    id="rubyStyle-output"
                    name="rubyStyle"
                    value={state.rubyStyle}
                    onChange={handleChange}
                    className="select-field"
                  >
                    {RUBY_STYLE_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <button
                onClick={processText}
                className="btn w-full mt-4"
                disabled={state.status === 'loading'}
              >
                設定を変更して再処理
              </button>
            </div>
          )}
          
          {/* デバッグ情報エリア */}
          <div className="card mt-6 bg-gray-100">
            <h3 className="text-lg font-semibold mb-2">デバッグ情報</h3>
            
            <div className="mb-4">
              <h4 className="font-medium">処理ステップ:</h4>
              <ul className="list-disc pl-5 text-sm">
                {debug.processingSteps.map((step, index) => (
                  <li key={index} className="mb-1">{step}</li>
                ))}
              </ul>
            </div>
            
            {debug.apiResponse && (
              <div>
                <h4 className="font-medium">APIレスポンス:</h4>
                <pre className="text-xs bg-gray-200 p-2 rounded overflow-auto max-h-40">
                  {JSON.stringify(debug.apiResponse, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </main>
        
        <footer className="py-6 text-center text-gray-500 text-sm">
          <p>Yahoo! JAPAN Developer Network APIを使用しています</p>
          <p>© {new Date().getFullYear()} Yahoo Ruby API Tool</p>
        </footer>
      </div>
    </>
  );
} 