import "./App.css";
import FlipClockCountdown, {createDate} from "./components/FlipClockCountdown";
import {useState} from "react";
import ParticlesContainer from "./ParticlesContainer";
import FireworksOverlay from "./components/FireworksOverlay";
import ThreeRoom from "./components/ThreeRoom";
import {BeerBottle} from "./components/BeerBottle";

function App() {
    const [target, setTarget] = useState<Date>(createDate(2026, 7, 19, 12, 50));
    const [isComplete, setIsComplete] = useState(false);
    const [isPlaneRight, setIsPlaneRight] = useState<boolean>(true);
    const [showRoom, setShowRoom] = useState(false);


    const handleOnComplete = () => {
        setIsComplete(true);
    };

    const handleOnMinuteChange = () => {
        setIsPlaneRight((b) => !b);
    };

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    window.setTarget = setTarget;


    return (
        <>
            {showRoom ? <ThreeRoom onClose={() => setShowRoom(false)} targetDate={target}/>
                : (
                    <div>
                        <div>
                            <div id="plane" className={isPlaneRight ? "right" : "left"}/>

                            <main>
                                <h1>Countdown to Ayia Napa</h1>
                                <FlipClockCountdown
                                    to={target}
                                    dividerStyle={{color: "#FFF"}}
                                    digitBlockStyle={{backgroundColor: "var(--secondary)", fontWeight: 600}}
                                    separatorStyle={{color: "var(--secondary)"}}
                                    labelStyle={{color: "#000"}}
                                    onComplete={handleOnComplete}
                                    hideOnComplete={false}
                                    onMinuteChange={handleOnMinuteChange}
                                />
                            </main>
                        </div>

                        <FireworksOverlay/>

                        <div style={{position: "absolute", bottom: 0, left: 0, zIndex: 100, aspectRatio: 1, width: "20vw"}}>
                            <BeerBottle onEmpty={() => setShowRoom(true)}/>
                        </div>

                        {isComplete && <ParticlesContainer/>}

                        <div id="drop_gradient"/>
                        <div id="drop_pattern"/>
                    </div>
                )
            }
        </>
    );
}

export default App;