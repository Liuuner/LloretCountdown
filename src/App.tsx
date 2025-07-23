import './App.css';
import FlipClockCountdown, { createDate } from "./components/FlipClockCountdown";
import { useState } from "react";
import ParticlesContainer from "./ParticlesContainer.tsx";

function App() {
    //const [target, setTarget] = useState<Date>(createDate(2024, 6, 16, 6, 45));
    const [target, setTarget] = useState<Date>(createDate(2025, 7, 30, 15, 50));
    const [isComplete, setIsComplete] = useState(false);
    const [isPlaneRight, setIsPlaneRight] = useState<boolean>(true);
    const [isDraw, setIsDraw] = useState(false);

    const cringeList = ["lars", "gian", "silvan", "laurin", "luca", "jens", "julian", "pablo", "jerome"]
    const handleOnComplete = () => {
        setIsComplete(true);
    }

    const handleOnMinuteChange = () => {
        setIsPlaneRight((b) => !b);
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    window.setTarget = setTarget;

    const [names, setNames] = useState<string[]>(Array(11).fill(''));
    const [assignedNames, setAssignedNames] = useState<string[]>(Array(11).fill(''));

    const handleNameChange = (index: number, value: string) => {

        if ( value.toLowerCase() ===  "marc" || value.toLowerCase() === "liun"){
            const newNames = [...names];
            newNames[index] = value + " de King";
            setNames(newNames);
        }
        else if (cringeList.includes(value.toLowerCase())){
        const newNames = [...names];
        newNames[index] = value + " de Gay";
        setNames(newNames);
        }
        else {
            const newNames = [...names];
            newNames[index] = value;
            setNames(newNames);
        }
    };

    const generateAssignments = () => {
        const shuffledNames = shuffleArray([...names]);

        setAssignedNames(shuffledNames);
    };

    const shuffleArray = (array: string[]): string[] => {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    };

    return (
        <>
            <div>
                {isDraw ? (
                    <div>
                        <table>
                            <thead className="tableThead">
                            <tr className="topLayer">
                                <th>Name</th>
                                <th>Zugewiesener Name</th>
                            </tr>
                            </thead>
                            <tbody>
                            {names.map((name, index) => (
                                <tr key={index}>
                                    <td><input type="text" value={name}
                                               onChange={(e) => handleNameChange(index, e.target.value)}
                                               className="inputField"/></td>
                                    <td className="assignedNames">{assignedNames[index]}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                        <button onClick={generateAssignments} className={"generateButton"}>Generieren</button>

                    </div>
                ) : (
                    <div>
                        <div id={"plane"} className={isPlaneRight ? "right" : "left"}/>
                        <main>
                            <h1 onClick={() => setIsDraw(true)}>Countdown to going home from Crete</h1>
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
                )}

                {
                    isComplete && (
                        <ParticlesContainer/>
                    )
                }

                <div id={"drop_gradient"}/>
                <div id="drop_pattern"/>
            </div>
        </>
    );
}

export default App;
