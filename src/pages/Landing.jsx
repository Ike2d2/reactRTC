import { Card } from "@nextui-org/react";
import { useCallInfo, Create, Join } from "../components";
import { useNavigate } from "react-router-dom";

export function Landing() {
    const navigate = useNavigate();
    const { dispatch } = useCallInfo();

    function handleJoin() {
        navigate('/reactRTC/call');
        dispatch({type: 'setSide', payload: 'answer'})
    }

    function handleCreate() {
        navigate('/reactRTC/call');
        dispatch({type: 'setSide', payload: 'offer'})
    }

    return (
        <div className='h-full flex items-center justify-center'>
            <Card isBlurred radius="none" className='p-3 gap-3 flex flex-col'>
                <Join onClick={handleJoin} />
                <i className="self-center text-gray-500">or</i>
                <Create onClick={handleCreate} />
            </Card>
        </div>
    )
}