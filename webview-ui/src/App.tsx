import { useState } from 'react';
import "./App.css";
import { FileInputButton, LoadedFileType } from "./components/FileInputButton";
// import FileSaveButton from "./components/FileSaveButton";
// @ts-ignore
import { UsfmEditor } from "@oce-editor-tools/mui-simple";
import { VSCodeProgressRing } from "@vscode/webview-ui-toolkit/react";
import { vscode } from './utilities/vscode';

function App() {
  const [usfmText,setUsfmText] = useState<String>()
  const [loading,setLoading] = useState<Boolean>(false)
  const [loaded,setLoaded] = useState<Boolean>(false)

  function handleClick(): void {
    setLoading(true)
  }

  function handleLoadedUSFM(data: LoadedFileType): void {
    const bookUsfm = data?.fileData;
    console.log('onLoadUSFM data', bookUsfm?.substring(0, 100))
    setUsfmText(bookUsfm)
    setLoaded(true)
    setLoading(false)
  }
  
  const onSave = (bookCode: String,usfm: String) => {
    console.log("save button clicked")
    console.log(bookCode)
    console.log(usfm)
    vscode.postMessage({
      command: "save",
      text: usfm,
    });
  }

  const onReferenceSelected = (reference: String) => console.log(reference)
  const onRenderToolbar = (obj: any) => {
    const { items } = obj;
    const _items = items.filter((item: any) => item?.key !== "print")
    return [..._items]
  }

  const editorProps = {
    onSave,
    usfmText,
    onRenderToolbar,
    onReferenceSelected,
    reference: {
      syncSrcId: "1",
      bookId: 'apg',
      chapter: 1,
      verse: "24-25",
    }
  }

  return (
    <main>
      {loading && <VSCodeProgressRing/>}
      {!loading && !loaded && (<>
        <h1>OCE USFM Editor!</h1>
        <FileInputButton
          onFileLoaded={handleLoadedUSFM}
          onClick={handleClick}
          title={"Open USFM File"}
          open={true}
        />
      </>)}
      {loaded && <UsfmEditor {...editorProps} />}
    </main>
  );
}

export default App;
