import Shell from "./components/Shell.jsx";
import { useEffect, useState, useCallback, useRef } from "react";
import { Input, Button } from "@nextui-org/react";
import { RiMicFill, RiMicOffFill, RiPhoneFill } from "react-icons/ri";
import {
    collection,
    addDoc,
    setDoc,
    doc,
    getDoc,
    updateDoc,
    query,
    onSnapshot,
} from "firebase/firestore";

export default function App() {
    const [muted, setMuted] = useState(false);
    const [calling, setCalling] = useState(false);
    const [callNumber, setCallNumber] = useState();
    const [peerConnection, setPeerConnection] = useState(new RTCPeerConnection(servers));

    function handleVideoClick(source) {
        source &&
            source.getVideoTracks().forEach((track) => {
                track.enabled = !track.enabled;
            });
    }

    function handleAudioClick(source) {
        setMuted(!muted);
        source.getAudioTracks().forEach((track) => {
            track.enabled = !track.enabled;
        });
    }

    function handleCallClick() {
        if (calling) {
            peerConnection.close();
            setPeerConnection(null)
            setPeerConnection(new RTCPeerConnection(servers));
            peerConnection.restartIce();
            setCallNumber(null);
        } else if (!calling) {
            if (localStream) {
                localStream.getTracks().forEach((track) => {
                    peerConnection.addTrack(track, remoteStream);
                });
            }
        }
        setCalling(!calling);
    }

    useEffect(() => {
        async function callHandling() {
            if (calling && !callNumber) {
                setCallNumber(callId);

                setDoc(doc(firestore, `calls/${callId}`), {});
                const offerCandidates = collection(
                    firestore,
                    `calls/${callId}/offerCandidates`
                );
                const answerCandidates = collection(
                    firestore,
                    `calls/${callId}/answerCandidates`
                );

                peerConnection.onicecandidate = (e) => {
                    e.candidate && addDoc(offerCandidates, e.candidate.toJSON());
                };

                const offerDescription = await peerConnection.createOffer();
                await peerConnection.setLocalDescription(offerDescription);

                const offer = {
                    sdp: offerDescription.sdp,
                    type: offerDescription.type,
                };

                await setDoc(doc(firestore, `calls/${callId}`), { offer });

                onSnapshot(query(doc(firestore, `calls/${callId}`)), (snap) => {
                    const data = snap.data();

                    !peerConnection.currentRemoteDescription &&
                        data.answer &&
                        peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
                });

                onSnapshot(answerCandidates, (snap) => {
                    snap.docChanges().forEach((change) => {
                        change.type === "added" &&
                            peerConnection.addIceCandidate(new RTCIceCandidate(change.doc.data()));
                    });
                });
            } else if (calling && callNumber) {
                const call = doc(firestore, `calls/${callNumber}`);
                const offerCandidates = collection(
                    firestore,
                    `calls/${callNumber}/offerCandidates`
                );
                const answerCandidates = collection(
                    firestore,
                    `calls/${callNumber}/answerCandidates`
                );

                peerConnection.onicecandidate = (e) => {
                    e.candidate && addDoc(answerCandidates, e.candidate.toJSON());
                };

                const callData = (await getDoc(call)).data();

                const offerDescription = callData.offer;
                await peerConnection.setRemoteDescription(
                    new RTCSessionDescription(offerDescription)
                );

                const answerDescription = await peerConnection.createAnswer();
                await peerConnection.setLocalDescription(
                    new RTCSessionDescription(answerDescription)
                );

                const answer = {
                    sdp: answerDescription.sdp,
                    type: answerDescription.type,
                };

                await updateDoc(call, { answer });

                onSnapshot(offerCandidates, (snap) => {
                    snap.docChanges().forEach((change) => {
                        change.type === "added" &&
                            peerConnection.addIceCandidate(new RTCIceCandidate(change.doc.data()));
                    });
                });
            }
        }
        callHandling();
    }, [calling]);

    useEffect(() => {
        async function getCam() {
            setLocalStream(
                await navigator.mediaDevices.getUserMedia({
                    audio: true,
                    video: { facingMode: "user" },
                })
            );
        }
        getCam();
    }, []);

    peerConnection.ontrack = (e) => {
        console.log(e);
        e.streams[0].getTracks().forEach((track) => {
            remoteStream.addTrack(track, localStream);
        });
    };

    return (
        <Shell>
            {callNumber && (
                <div className="absolute top-20 w-1/2 flex items-center justify-center">
                    <span className="">Call Number: {callNumber}</span>
                </div>
            )}

            <div className="w-full flex grow items-center justify-around">
                <div className="flex flex-col items-center gap-4 px-4 py-8 bg-gray-100 shadow-inner">
                    <Video
                        onClick={() => {
                            handleVideoClick(localStream);
                            handleVideoClick(localCam);
                        }}
                        source={localCam}
                        className="w-96 aspect-square rounded-full object-cover overflow-hidden shadow-lg hover:scale-[105%] active:scale-100 transition-transform"
                    />
                    <Button
                        color='danger'
                        radius='full'
                        size='lg'
                        isIconOnly
                        onClick={() => handleAudioClick(localStream)}
                    >
                        {!muted ? (
                            <RiMicFill color="white" size="2em" />
                        ) : (
                            <RiMicOffFill color="white" size="2em" />
                        )}
                    </Button>
                </div>
                <div className="flex flex-col items-center gap-4 px-4 py-8 bg-gray-100 shadow-inner">
                    <Video
                        source={remoteStream}
                        className="w-96 aspect-square rounded-full object-cover overflow-hidden shadow-lg"
                    />
                    <div className="flex gap-x-6 items-center">
                        <Button
                            onClick={handleCallClick}
                            isIconOnly
                            radius='full'
                            color={calling ? 'default' : 'success'}
                            size='lg'
                        >
                            {calling ? (
                                <RiPhoneFill
                                    color="rgb(239 68 68)"
                                    size="2em"
                                    style={{ transform: "rotate(135deg)" }}
                                />
                            ) : (
                                <RiPhoneFill color="white" size="2em" />
                            )}
                        </Button>
                        {!calling && (
                            <Input
                                onChange={(e) => setCallNumber(e.target.value)}
                                variant="flat"
                                type="text"
                                label='Call #'
                            ></Input>
                        )}
                    </div>
                </div>
            </div>
        </Shell>
    );
}