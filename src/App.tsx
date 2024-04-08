import './App.css';
import FlipClockCountdown, {createDate} from "./components/FlipClockCountdown";
import {useState} from "react";


function App() {
    // const [target, setTarget] = useState<Date>(createDate(2024, 4, 2, 15, 11));
    const [target, setTarget] = useState<Date>(createDate(2024, 7, 16, 7, 0));
    const [isComplete, setIsComplete] = useState(false);

    const onComplete = () => {
        setIsComplete(true);
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    window.setTarget = setTarget;

    return (
        <>
            <main className={isComplete ? "complete" : "incomplete"}>
                <h1>Countdown to Lloret</h1>
                <FlipClockCountdown
                    to={target}
                    dividerStyle={{color: "#FFF"}}
                    digitBlockStyle={{backgroundColor: "var(--secondary)", fontWeight: 600}}
                    separatorStyle={{color: "var(--secondary)"}}
                    labelStyle={{color: "#000"}}
                    onComplete={onComplete}
                    hideOnComplete={false}
                />
            </main>

            <div id={"drop_gradient"}/>
            <div id="drop_pattern"/>
        </>

    )
}

export default App
