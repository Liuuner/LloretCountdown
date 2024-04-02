import './App.css';
import FlipClockCountdown, {createDate} from "./components/FlipClockCountdown";

function App() {
    // YYYY-MM-DDTHH:mm:ss.sssZ
    const target = createDate(2024, 7, 16, 7, 0)

    return (
        <>
            <h1>Countdown to Lloret</h1>
            <FlipClockCountdown to={target}/>
        </>
    )
}

export default App
