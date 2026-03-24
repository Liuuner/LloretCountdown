import "./App.css";
import FlipClockCountdown, { createDate } from "./components/FlipClockCountdown";
import { useState } from "react";
import ParticlesContainer from "./ParticlesContainer";
import FireworksOverlay from "./components/FireworksOverlay";
import ThreeRoom from "./components/ThreeRoom";

function App() {
    const [target, setTarget] = useState<Date>(createDate(2026, 7, 19, 12, 50));
    const [isComplete, setIsComplete] = useState(false);
    const [isPlaneRight, setIsPlaneRight] = useState<boolean>(true);
    const [isDraw, setIsDraw] = useState(false);
    const [showRoom, setShowRoom] = useState(false);

    const cringeList = ["lars", "leo", "silvan", "laurin", "luca", "alex", "noe", "jerome"];

    const handleOnComplete = () => {
        setIsComplete(true);
    };

    const handleOnMinuteChange = () => {
        setIsPlaneRight((b) => !b);
    };

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    window.setTarget = setTarget;

    const [names, setNames] = useState<string[]>(Array(10).fill(""));
    const [assignedNames, setAssignedNames] = useState<string[]>(Array(10).fill(""));

    const handleNameChange = (index: number, value: string) => {
        const newNames = [...names];

        if (value.toLowerCase() === "marc" || value.toLowerCase() === "liun") {
            newNames[index] = value + " de King";
        } else if (cringeList.includes(value.toLowerCase())) {
            newNames[index] = value + " de Gay";
        } else {
            newNames[index] = value;
        }

        setNames(newNames);
    };

    const shuffleArray = (array: string[]): string[] => {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    };

    const generateAssignments = () => {
        const shuffledNames = shuffleArray([...names]);
        setAssignedNames(shuffledNames);
    };

    return (
        <>
            {showRoom && <ThreeRoom onClose={() => setShowRoom(false)} targetDate={target} />}

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
                                    <td>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => handleNameChange(index, e.target.value)}
                                            className="inputField"
                                        />
                                    </td>
                                    <td className="assignedNames">{assignedNames[index]}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>

                        <button onClick={generateAssignments} className="generateButton">
                            Generieren
                        </button>

                        <button
                            onClick={() => setShowRoom(true)}
                            className="generateButton"
                            style={{ marginLeft: "12px" }}
                        >
                            Secret
                        </button>
                    </div>
                ) : (
                    <div>
                        <div id="plane" className={isPlaneRight ? "right" : "left"} />

                        <main>
                            <h1 onClick={() => setIsDraw(true)}>Countdown to Ayia Napa</h1>

                            <FlipClockCountdown
                                to={target}
                                dividerStyle={{ color: "#FFF" }}
                                digitBlockStyle={{ backgroundColor: "var(--secondary)", fontWeight: 600 }}
                                separatorStyle={{ color: "var(--secondary)" }}
                                labelStyle={{ color: "#000" }}
                                onComplete={handleOnComplete}
                                hideOnComplete={false}
                                onMinuteChange={handleOnMinuteChange}
                            />

                            <button
                                onClick={() => setShowRoom(true)}
                                className="generateButton"
                                style={{ marginTop: "24px" }}
                            >
                                Secret
                            </button>
                        </main>
                    </div>
                )}

                {isComplete && <ParticlesContainer />}

                <FireworksOverlay />

                <div id="drop_gradient" />
                <div id="drop_pattern" />
            </div>
        </>
    );
}

export default App;