import CodeMirror, { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { createRef, useState } from 'react';
import './CodeEditorInput.css'
import {toJson} from 'really-relaxed-json';
import Chart from "react-apexcharts";
import { oneDark } from '@codemirror/theme-one-dark';

export function CodeEditorInput() {

  let codeEditorRef = createRef<ReactCodeMirrorRef>();

  let codeEditorDivRef = createRef<HTMLDivElement>();

  const [statePosition, setStatePosition] = useState({y:0, h: 0})
  const [stateHeight, setStateHeight] = useState('200px')
  const [stateEditorOutput, setStateEditorOutput] = useState('')
  const [stateRawGrafphInput, setStateRawGrafphInput] = useState(Object())
  const [stateOption, setStateOptions] = useState(Object())
  const [stateSeries, setStateSeries] = useState([])

  // This function gets the output from the code editor and process it to fit the graph's options and series
  function getInputValue( _event: any) {
    let value = stateRawGrafphInput

    stateEditorOutput.trim().split('\n').map((line)=>{
        let jsonLine = JSON.parse(toJson(line))

        switch (jsonLine.type){
          case 'start':
            value.labels = jsonLine.group
            value.values = jsonLine.select
            value['startTimestamp'] = jsonLine.timestamp
            value['stopTimestamp'] = undefined
            value.data = {}
            value['min'] = undefined
            value['max'] = undefined
            value['rangeTimestamp'] = undefined
            value['dataTimeStamp'] = []
            break;
          case 'data':
            if(value.labels !== undefined && value.values !== undefined && value['stopTimestamp'] === undefined && value['dataTimeStamp'].length <= 1000 && Object.keys(value.data).length <= 1000){
              value.values.map((v: any)=>{
                let aux = ''
                value.labels.map((label: any)=>{
                  aux = aux + "_" + jsonLine[label]
                })
                if(value.data[aux + "_" + v] == undefined){
                  console.log({[jsonLine.timestamp]: jsonLine[v]})
                  value.data[aux + "_" + v] = [[jsonLine.timestamp, jsonLine[v]]]
                }
                else{
                  console.log({[jsonLine.timestamp]: jsonLine[v]})
                  value.data[aux + "_" + v].push([jsonLine.timestamp, jsonLine[v]])
                }
              })
              value['dataTimeStamp'].push(jsonLine.timestamp)
            }
            break;
          case 'span':
            if(jsonLine.timestamp > value['rangeTimestamp'] && value['stopTimestamp'] === undefined ){
              value['min'] = jsonLine.begin
              value['max'] = jsonLine.end
              value['rangeTimestamp'] = jsonLine.timestamp
            }
            break;
          case 'stop':
            value['stopTimestamp'] = jsonLine.timestamp
            break;

        }
    })

    let options = {
      noData: {
        text: "There's no data",
        align: 'center',
        verticalAlign: 'middle',
        offsetX: 0,
        offsetY: 0
        },
      xaxis: {
        type: 'datetime',
        min: value['min'],
        max: value['max'],
        labels: {
          datetimeFormatter: {
            hour: 'HH:mm'
          }
        }
      },
      legend: {
        position: 'right'

      }
    }

    let series = Object.entries(value.data).map((data: any)=>{
      return {
        name: data[0].replaceAll('_', ' '),
        data: data[1]
      }
    })

    setStateRawGrafphInput(value)

    setStateOptions(options)

    setStateSeries(series)
}
  //these functions are used to calculate the height while the code editor is being resized
  function on_drag(e: any) {
    setStateHeight(Math.max(200, (statePosition.h + e.clientY - statePosition.y)) + "px");
  }
  
  function on_release(_e: any) {
    console.log("end");
    document.body.removeEventListener("mousemove", on_drag);
    window.removeEventListener("mouseup", on_release);
  }

  function getPosition (event:any) {   
    let height = codeEditorDivRef.current?.clientHeight ? codeEditorDivRef.current?.clientHeight : 0
    console.log("start");
    setStatePosition({y:event.clientY, h: height})
    document.body.addEventListener("mousemove", on_drag);
    window.addEventListener("mouseup", on_release);
  }
  return (
    <div >
      <div>
          <div ref={codeEditorDivRef} style={{ height: stateHeight, maxHeight:'500px' }}>
              <CodeMirror
                  ref={codeEditorRef}
                  className='inputStyle'
                  height='100%'
                  theme={oneDark}
                  extensions={[javascript({ jsx: true })]}
                  onChange={(value, _viewUpdate) => {
                      console.log('value:', value);
                      setStateEditorOutput(value)
                  } } />
          </div>
          <div className='handle' onMouseDown={getPosition}></div>
        </div >
            <div style={{width: '100%', height: '300px'}}>
              <Chart
                options={stateOption}
                series={stateSeries}
                type="line"
                width="100%"
                height="100%"
              />
            </div>
        <div style={{ position: 'fixed', left: 0, bottom: 0, height:'60px', width: '100%', backgroundColor: '#dddee1', paddingLeft: '40px', paddingTop: '40px'}}>
          <button onClick={getInputValue} style={{ backgroundColor:'#017eff', color:'white', borderColor:'transparent'}}>GENERATE CHART</button>
        </div>  
    </div>
  );
}