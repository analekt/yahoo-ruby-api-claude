import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { FuriganaProcessor } from '@/utils/furiganaProcessor';
import { GradeLevel, RubyStyle } from '@/types';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

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

export default function Home() {
  // 設定と状態の管理
  const [clientId, setClientId] = useState<string>('');
  const [skipLength, setSkipLength] = useState<number>(6080);
  const [rubyStyle, setRubyStyle] = useState<RubyStyle>('墨つき括弧');
  const [grade, setGrade] = useState<GradeLevel>('8');
  const [inputText, setInputText] = useState<string>('');
  const [outputText, setOutputText] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [saveClientId, setSaveClientId] = useState<boolean>(true);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [showDebug, setShowDebug] = useState<boolean>(false);

  // Client IDをローカルストレージから復元
  useEffect(() => {
    const savedClientId = localStorage.getItem('yahooClientId');
    if (savedClientId) {
      setClientId(savedClientId);
    }
    
    // 環境情報を収集
    const browserInfo = `${navigator.userAgent}`;
    const screenInfo = `Screen: ${window.innerWidth}x${window.innerHeight}`;
    setDebugInfo(`Browser: ${browserInfo}\n${screenInfo}`);
  }, []);

  // ルビを振る処理
  const applyFurigana = async () => {
    if (!clientId) {
      toast.error('Client IDを入力してください');
      return;
    }

    if (!inputText) {
      toast.error('テキストを入力してください');
      return;
    }

    try {
      setIsProcessing(true);
      setOutputText('処理中...');
      addDebugInfo('処理開始');
      
      // Client IDをローカルストレージに保存
      if (saveClientId) {
        localStorage.setItem('yahooClientId', clientId);
      }

      // FuriganaProcessorを初期化
      const processor = new FuriganaProcessor(clientId, skipLength, grade, rubyStyle);
      
      addDebugInfo(`プロセッサー初期化: スキップ長=${skipLength}, 学年=${grade}, スタイル=${rubyStyle}`);
      
      // ルビを振る処理を実行
      try {
        const result = await processor.process(inputText);
        setOutputText(result);
        addDebugInfo('処理完了！');
        toast.success('処理完了！');
      } catch (processingError: any) {
        console.error('Processing error:', processingError);
        addDebugInfo(`処理エラー: ${processingError.message}`);
        toast.error(`処理中にエラーが発生しました: ${processingError.message}`);
        setOutputText('エラーが発生しました。デバッグ情報を確認してください。');
      }
    } catch (error: any) {
      console.error('Error:', error);
      addDebugInfo(`エラー: ${error.message}`);
      toast.error(`エラーが発生しました: ${error.message}`);
      setOutputText('');
    } finally {
      setIsProcessing(false);
    }
  };

  // 結果をクリップボードにコピー
  const copyResult = () => {
    if (outputText) {
      navigator.clipboard.writeText(outputText);
      toast.success('結果をクリップボードにコピーしました');
    }
  };
  
  // デバッグ情報を追加
  const addDebugInfo = (info: string) => {
    setDebugInfo(prev => `${new Date().toISOString()} - ${info}\n${prev}`);
  };
  
  // キャッシュをクリア
  const clearCache = () => {
    try {
      // ローカルストレージをクリア
      localStorage.clear();
      
      // キャッシュをクリア
      if ('caches' in window) {
        caches.keys().then(cacheNames => {
          cacheNames.forEach(cacheName => {
            caches.delete(cacheName);
          });
        });
      }
      
      // ServiceWorkerを登録解除
      if (navigator.serviceWorker) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
          for (const registration of registrations) {
            registration.unregister();
          }
        });
      }
      
      addDebugInfo('キャッシュをクリアしました');
      toast.success('キャッシュをクリアしました。ページを再読み込みしてください。');
    } catch (error: any) {
      console.error('Cache clear error:', error);
      addDebugInfo(`キャッシュクリアエラー: ${error.message}`);
      toast.error(`キャッシュクリア中にエラーが発生しました: ${error.message}`);
    }
  };
  
  // サンプルリクエストを実行してAPIの接続をテスト
  const testApiConnection = async () => {
    if (!clientId) {
      toast.error('Client IDを入力してください');
      return;
    }
    
    try {
      addDebugInfo('API接続テスト開始');
      
      const apiPath = getApiUrl('/api/furigana');
      addDebugInfo(`API接続テスト: ${apiPath}`);
      
      const response = await fetch(apiPath, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        body: JSON.stringify({
          text: '漢字',
          clientId,
          grade
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        addDebugInfo(`API接続テスト失敗: ${response.status} ${response.statusText} - ${errorText}`);
        toast.error(`API接続テストに失敗しました: ${response.status} ${response.statusText}`);
        return;
      }
      
      const data = await response.json();
      addDebugInfo(`API接続テスト成功: ${JSON.stringify(data).substring(0, 100)}...`);
      toast.success('API接続テストに成功しました');
    } catch (error: any) {
      console.error('API test error:', error);
      addDebugInfo(`API接続テストエラー: ${error.message}`);
      toast.error(`API接続テスト中にエラーが発生しました: ${error.message}`);
    }
  };

  return (
    <>
      <Head>
        <title>ルビ振りツール</title>
        <meta name="description" content="Yahoo!デベロッパーネットワークのAPIを使ったルビ振りツール" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
        <div className="relative py-3 sm:max-w-xl md:max-w-2xl lg:max-w-4xl xl:max-w-6xl mx-auto">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-500 shadow-lg transform -skew-y-6 sm:skew-y-0 sm:-rotate-6 sm:rounded-3xl"></div>
          <div className="relative px-4 py-10 bg-white shadow-lg sm:rounded-3xl sm:p-20">
            <div className="max-w-6xl mx-auto">
              <div className="divide-y divide-gray-200">
                <div className="py-8 text-base leading-6 space-y-4 text-gray-700 sm:text-lg sm:leading-7">
                  <h1 className="text-3xl font-extrabold text-center text-indigo-600 mb-8">ルビ振りツール</h1>
                  
                  {/* 入力設定 */}
                  <div className="bg-gray-50 p-4 rounded-lg mb-6">
                    <h2 className="text-xl font-bold mb-4 text-gray-800">入力設定</h2>
                    
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Client ID (アプリケーションID)
                      </label>
                      <input
                        type="text"
                        value={clientId}
                        onChange={(e) => setClientId(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Yahoo!デベロッパーネットワークのClient IDを入力"
                      />
                      <div className="mt-1 flex items-center">
                        <input
                          type="checkbox"
                          id="saveClientId"
                          checked={saveClientId}
                          onChange={(e) => setSaveClientId(e.target.checked)}
                          className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                        <label htmlFor="saveClientId" className="ml-2 block text-sm text-gray-700">
                          Client IDをブラウザに記憶する
                        </label>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        ルビをスキップする文字数
                      </label>
                      <input
                        type="number"
                        value={skipLength}
                        onChange={(e) => setSkipLength(parseInt(e.target.value))}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="6080"
                      />
                      <p className="mt-1 text-sm text-gray-500">
                        一度ルビを付与した漢字が、続く設定文字数内で再登場した場合、ルビを付与しません。「｛改頁｝」という文字列が現れると、スキップカウントはリセットされます。
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          ルビを付与する基準
                        </label>
                        <select
                          value={grade}
                          onChange={(e) => setGrade(e.target.value as GradeLevel)}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                          aria-label="ルビを付与する基準の選択"
                        >
                          <option value="1">小学1年生向け。漢字にふりがなを付けます。</option>
                          <option value="2">小学2年生向け。漢字にふりがなを付けます。</option>
                          <option value="3">小学3年生向け。漢字にふりがなを付けます。</option>
                          <option value="4">小学4年生向け。漢字にふりがなを付けます。</option>
                          <option value="5">小学5年生向け。漢字にふりがなを付けます。</option>
                          <option value="6">小学6年生向け。漢字にふりがなを付けます。</option>
                          <option value="7">中学生向け。漢字にふりがなを付けます。</option>
                          <option value="8">一般向け。常用漢字にはふりがなを付けません。</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          ルビのスタイル
                        </label>
                        <select
                          value={rubyStyle}
                          onChange={(e) => setRubyStyle(e.target.value as RubyStyle)}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                          aria-label="ルビのスタイルの選択"
                        >
                          <option value="墨つき括弧">墨つき括弧 (例: 漢字【かん】字)</option>
                          <option value="XHTML">XHTML (例: &lt;ruby&gt;漢字&lt;rt&gt;かんじ&lt;/rt&gt;&lt;/ruby&gt;)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  
                  {/* 入力テキスト */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ルビを付与するテキスト
                    </label>
                    <textarea
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 h-40"
                      placeholder="ルビを振りたいテキストを入力してください"
                    />
                  </div>
                  
                  {/* ボタン */}
                  <div className="flex flex-wrap justify-center gap-2 mb-4">
                    <button
                      onClick={applyFurigana}
                      disabled={isProcessing}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                      {isProcessing ? '処理中...' : 'ルビをふる'}
                    </button>
                    
                    <button
                      onClick={testApiConnection}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      API接続テスト
                    </button>
                    
                    <button
                      onClick={clearCache}
                      className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                    >
                      キャッシュクリア
                    </button>
                    
                    <button
                      onClick={() => setShowDebug(!showDebug)}
                      className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                    >
                      {showDebug ? 'デバッグ情報を隠す' : 'デバッグ情報を表示'}
                    </button>
                  </div>
                  
                  {/* デバッグ情報 */}
                  {showDebug && (
                    <div className="mb-4 p-4 bg-gray-100 rounded-md">
                      <h3 className="text-lg font-medium text-gray-900 mb-2">デバッグ情報</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <h4 className="text-md font-medium text-gray-800">環境情報</h4>
                          <pre className="whitespace-pre-wrap text-xs bg-gray-800 text-white p-2 rounded-md overflow-auto max-h-40">
                            URL: {typeof window !== 'undefined' ? window.location.href : ''}
                            ユーザーエージェント: {typeof navigator !== 'undefined' ? navigator.userAgent : ''}
                            画面サイズ: {typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : ''}
                          </pre>
                        </div>
                        <div>
                          <h4 className="text-md font-medium text-gray-800">処理ログ</h4>
                          <pre className="whitespace-pre-wrap text-xs bg-gray-800 text-white p-2 rounded-md overflow-auto max-h-40">
                            {debugInfo}
                          </pre>
                        </div>
                      </div>
                      <h4 className="text-md font-medium text-gray-800">トラブルシューティング</h4>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <button
                          onClick={() => {
                            addDebugInfo('手動リロード実行');
                            window.location.reload();
                          }}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md"
                        >
                          ページをリロード
                        </button>
                        <button
                          onClick={() => {
                            const url = '/api/furigana?test=1';
                            addDebugInfo(`シンプルAPIリクエスト: ${url}`);
                            window.open(url, '_blank');
                          }}
                          className="px-3 py-1 bg-green-600 text-white text-sm rounded-md"
                        >
                          APIエンドポイントを開く
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* 出力結果 */}
                  {outputText && (
                    <div className="mt-6">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-lg font-medium text-gray-900">出力結果</h3>
                        <button
                          onClick={copyResult}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          結果をコピー
                        </button>
                      </div>
                      <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
                        <div className="whitespace-pre-wrap break-words">
                          {outputText}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        <footer className="text-center text-gray-500 text-sm mt-8">
          <p>Yahoo!デベロッパーネットワークのルビ振りAPIを使用しています。詳しくは<a href="https://github.com/analekt/yahoo-ruby-api-claude" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">こちら</a>をご覧ください。</p>
        </footer>
      </div>
      <ToastContainer position="bottom-right" />
    </>
  );
} 