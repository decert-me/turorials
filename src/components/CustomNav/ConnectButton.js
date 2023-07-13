import React, { useContext, useEffect, useState } from 'react';
import { Button, Dropdown } from "antd";
import { useAccount } from 'wagmi';
import CustomSign from '../CustomSign';
import { GlobalContext } from '../../provider';
import { getUser } from '../../request/public';
import { hashAvatar } from '../../utils/HashAvatar';

export default function ConnectButton(props) {
    
    const { 
        menu, openModal
    } = props;

    const { isSign, updateUser, user } = useContext(GlobalContext);
    const { address, isConnected } = useAccount();
    let [ avatar, setAvatar ] = useState("");

    function NickName(address) {
        return address && address.substring(0,5) + "..." + address.substring(38,42);
    }

    function getUserInfo() {
        getUser({address: address})
        .then(res => {
            if (res.status === 0) {
                const img = res.data.avatar;
                let obj = res.data;
                let avatar = img ? process.env.BASE_URL + img : hashAvatar(address);
                obj.avatar = avatar;
                // setAvatar(avatar);
                updateUser(obj);
            }
        })
    }

    useEffect(() => {
        address && getUserInfo()
    },[address])

    return (
        <>
            {
                isSign &&
                <CustomSign />
            }
            {
                user ?
                    <Dropdown
                        placement="bottom" 
                        // trigger="click"
                        menu={{
                            items: menu
                        }}
                        overlayClassName="custom-dropmenu"
                        overlayStyle={{
                            width: "210px"
                        }}
                    >
                        <div className="user" id="hover-btn-line">
                            <img src={user.avatar} alt="" />
                            <p>{NickName(user.address)}</p>
                        </div>
                    </Dropdown>
                :
                    <Button
                        onClick={() => openModal()} 
                        id='hover-btn-full'
                        className='connect'
                    >链接钱包</Button>
            }   
        </>
    )
}