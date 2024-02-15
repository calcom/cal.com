import { useState } from "react"
import curlCommands from "./JSON/test.js"

export const CurlConverter = (props) => {
    const [selectedLanguage, setSelectedLanguage] = useState('CURL'); // default to cURL

    return (
        <div className="dark:bg-gray-800 bg-gray-100 text-gray-900 dark:text-white rounded p-4">
            <div className="flex justify-between items-center mb-2">
                <label>Select Language: </label>
                <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                >
                    {Object.keys(props.curlCommands).map(lang => (
                        <option key={lang} value={lang}>{lang.charAt(0).toUpperCase() + lang.slice(1)}</option>
                    ))}
                </select>
                <button className="text-xs text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white">Copy</button>
            </div>
            <h4>Snippet for {selectedLanguage.charAt(0).toUpperCase() + selectedLanguage.slice(1)}:</h4>
            <div className="text-sm bg-gray-100 p-3 rounded">
                    <span className="text-sm uppercase tracking-wide">{props.method}</span>
            <textarea
                className="text-black"
                value={props.curlCommands[selectedLanguage]}
                readOnly
                rows={5}
                style={{width: '100%'}}
            ></textarea>
            </div>
            </div>
    );
}

<CurlConverter method={"GET"} curlCommands={curlCommands} />
