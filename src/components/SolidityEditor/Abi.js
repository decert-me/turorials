import React, { useState } from "react";
import { Button } from "antd";
import {
    DownOutlined,
  } from '@ant-design/icons';
import Inner from "./Inner";
const point = (<>,&nbsp;</>)


export default function Abi(props) {
    
    const { abi, contractName, contract, changeLog, selectIndex, showInner } = props;

    let [isHideAbi, setIsHideAbi] = useState(true);

    async function callFunc(name, args) {
        let result;
        try {
            result = args ? await contract[name].apply(null, args) : await contract[name]();
            
        } catch (error) {
            changeLog(`Error: ${error.message}`)
            return
        }
        if (result.hash) {
            changeLog(`发起请求：${contractName}.${name}( ) Gas使用: ${result.gasLimit.toString()}`)
        }else{
            changeLog(`发起请求：${contractName}.${name}( ) 返回值为: ${result.toString()}`)
        }
    }

    return (
        <ul className={`${isHideAbi ? "show" : "hide" }`}>
            <li>
                <div className="title">
                    <p>{contractName}</p>
                    <p>{contract.address.slice(0,6)}...{contract.address.slice(38,42)}</p>
                    <div className="close" onClick={() => {setIsHideAbi(!isHideAbi)}}>
                        <DownOutlined />
                    </div>
                </div>
            </li>
            {
                abi.map((e,i) => 
                    <li key={i}>
                        <div className="btns">
                            <Button onClick={() => callFunc(e.name)} disabled={e.inputs.length !== 0}>
                                {e.name}
                                ({
                                    e.inputs.map((ele,index) => 
                                        <span key={index}>{ele.type} {ele.name}{index+1 !== e.inputs.length ? point : ""}</span>
                                    )
                                })
                            </Button>
                            {
                                e.inputs.length !== 0 &&
                                <div className={`icon ${selectIndex === i ? "select" : ""}`} onClick={() => showInner(i)}>
                                    <DownOutlined />
                                </div>
                            }
                        </div>
                        {
                            selectIndex === i &&
                            <div className="inner">
                                <Inner 
                                    inputs={e.inputs} 
                                    callFunc={callFunc} 
                                    name={e.name} 
                                />
                            </div>
                        }
                    </li>    
                )
            }
        </ul>
    )
}