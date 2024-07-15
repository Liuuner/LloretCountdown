import {useEffect, useMemo, useState} from "react";
import Particles, {initParticlesEngine} from "@tsparticles/react";
import {
    type Container,
    type ISourceOptions,
    MoveDirection,
    OutMode,
} from "@tsparticles/engine";
// import { loadAll } from "@tsparticles/all"; // if you are going to use `loadAll`, install the "@tsparticles/all" package too.
// import { loadFull } from "tsparticles"; // if you are going to use `loadFull`, install the "tsparticles" package too.
import {loadSlim} from "@tsparticles/slim"; // if you are going to use `loadSlim`, install the "@tsparticles/slim" package too.
// import { loadBasic } from "@tsparticles/basic"; // if you are going to use `loadBasic`, install the "@tsparticles/basic" package too.

const ParticlesContainer = () => {
    const [init, setInit] = useState(false);

    // this should be run only once per application lifetime
    useEffect(() => {
        initParticlesEngine(async (engine) => {
            // you can initiate the tsParticles instance (engine) here, adding custom shapes or presets
            // this loads the tsparticles package bundle, it's the easiest method for getting everything ready
            // starting from v2 you can add only the features you need reducing the bundle size
            //await loadAll(engine);
            //await loadFull(engine);
            await loadSlim(engine);
            //await loadBasic(engine);
        }).then(() => {
            setInit(true);
        });
    }, []);

    const particlesLoaded = async (container?: Container): Promise<void> => {
        console.log(container);
    };

    const options: ISourceOptions = useMemo(
        () => ({
            fpsLimit: 120,
            interactivity: {
                events: {
                    onClick: {
                        enable: true,
                        mode: "push",
                    },
                },
                modes: {
                    push: {
                        quantity: 100
                    },
                },
            },

            particles: {
                color: {
                    value: [
                        "#1E00FF",
                        "#FF0061",
                        "#E1FF00",
                        "#00FF9E"
                    ]
                },
                "move": {
                    "decay": 0.05,
                    "direction": "top",
                    "enable": true,
                    "gravity": {
                        "enable": true
                    },
                    "outModes": {
                        "top": "none",
                        "default": "destroy"
                    },
                    "speed": {
                        "min": 50,
                        "max": 100
                    }
                },

                number: {
                    density: {
                        enable: true,
                    },
                    value: 5000,
                },

                opacity: {
                    value: 1,
                },
                shape: {
                    type: "square",
                },
                size: {
                    value: {min: 1, max: 5},
                },
            },
            detectRetina: true,
        }),
        [],
    );

    if (init) {
        return (
            <Particles
                id="tsparticles"
                particlesLoaded={particlesLoaded}
                options={options}
            />
        );
    }

    return <></>;
};

export default ParticlesContainer;