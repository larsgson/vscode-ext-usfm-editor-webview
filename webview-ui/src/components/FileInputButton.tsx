import React, { useRef } from 'react';
// @ts-ignore
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import { vscode } from '../utilities/vscode';

// @ts-ignore
/// unfortunately, this doesn't work in the webview, fs is undefined
// import * as fs from 'node:fs';

console.log("FileInput")

export type LoadedFileType = {
  fileUrl: string,
  fileData: string | undefined,
};

export interface OnFileLoadedType {
  (data: LoadedFileType): void;
}

export interface OnFileClickType {
  (): void;
}

export type FileInputParams = {
  onClick: OnFileClickType,
  onFileLoaded: OnFileLoadedType,
  open: boolean,
  title: string,
};

export const FileInputButton: React.FC<FileInputParams> = ({
  onClick,
  onFileLoaded,
  open,
  title,
}) => {
  const inputFile = useRef(null);

  const onButtonClick = () => {
    let listener:any = null

    // @ts-ignore
    listener = event => { // catch the response of the file picker
      const message = event.data;
      if (message.command === 'WEBVIEW_FILE_OPEN_RESULTS') {
        const fileUrl = message?.results?.filePath
        const fileData = message?.results?.contents
        console.log(`file picker finished: ${fileUrl}`)

        // @ts-ignore
        listener && window.removeEventListener('message', listener) // remove listener

        console.log("FileInput - loaded file", fileData?.substring(0, 100));
        onFileLoaded?.({
          fileUrl,
          fileData,
        })
      }
    };

    window.addEventListener('message', listener);
    console.log("File Dialog is open");
    onClick?.()

    vscode.postMessage({
      command:'openFilePicker',
      canSelectMany: false,
      label: 'Open USFM',
      filters: {
        'USFM files': ['usfm'],
        'All files': ['*']
      }
    });
  };

  return (
    open ?
      <div style={{"padding": "10px"}}>
        <VSCodeButton
          onClick={onButtonClick}
          id={"FileInputButton"}
        >
          {title}
        </VSCodeButton>
      </div>
    :
      <></>
  );
}

export default FileInputButton;
