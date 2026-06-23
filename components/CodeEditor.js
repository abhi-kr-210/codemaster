import dynamic from 'next/dynamic';

const JavaCodeEditor = dynamic(() => import('./JavaCodeEditor'), {
  ssr: false,
  loading: () => (
    <div className="editor-loading">
      <div className="boot-loader" />
      <span>Loading Java editor…</span>
    </div>
  ),
});

export default function CodeEditor(props) {
  return <JavaCodeEditor {...props} />;
}
