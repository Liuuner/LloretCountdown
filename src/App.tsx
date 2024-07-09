import './App.css';
import FlipClockCountdown, { createDate } from "./components/FlipClockCountdown";
import { useEffect, useState } from "react";

function App() {
    const [target, setTarget] = useState<Date>(createDate(2024, 7, 16, 7, 10));
    const [isComplete, setIsComplete] = useState(false);
    const [isPlaneRight, setIsPlaneRight] = useState<boolean>(true);
    const [isDraw, setIsDraw] = useState(false);

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
        const newNames = [...names];
        newNames[index] = value;
        setNames(newNames);
    };

    const generateAssignments = () => {
        let shuffledNames = shuffleArray([...names]);

        // Assign each person to another person
        for (let i = 0; i < names.length; i++) {
            // Ensure that no one is assigned to themselves
            if (names[i] === shuffledNames[i]) {
                const j = (i + 1) % names.length;
                [shuffledNames[i], shuffledNames[j]] = [shuffledNames[j], shuffledNames[i]];
            }
        }

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
                            <thead>
                            <tr>
                                <th>Name</th>
                                <th>Zugewiesener Name</th>
                            </tr>
                            </thead>
                            <tbody>
                            {names.map((name, index) => (
                                <tr key={index}>
                                    <td><input type="text" value={name} onChange={(e) => handleNameChange(index, e.target.value)} /></td>
                                    <td>{assignedNames[index]}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                        <button onClick={generateAssignments}>Generieren</button>
                    </div>
                ) : (
                    <div>
                        <div id={"plane"} className={isPlaneRight ? "right" : "left"} />
                        <main>
                            <h1 onClick={() => setIsDraw(true)}>Countdown to Lloret</h1>
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
                        </main>
                        <div id={"drop_gradient"} />
                        <div id="drop_pattern" />
                    </div>
                )}
            </div>
        </>
    );
}

export default App;
