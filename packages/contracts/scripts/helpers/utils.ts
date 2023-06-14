import { HardhatRuntimeEnvironment } from "hardhat/types";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getContractNameFromScriptFileName = (filename) => {
    return filename.substring(filename.lastIndexOf("-") + 1, filename.lastIndexOf("."));
};

const arrayToUnique = (value, index, self) => {
    return self.indexOf(value) === index;
};

const logTimer = (time, passedTime) => {
    const delaySeconds = time / 1000;
    let timer = delaySeconds - passedTime;

    const hours = Math.round(timer / 3600);
    const minutes = Math.round((timer % 3600) / 60);
    const seconds = Math.round(timer % 60);
    const hoursStr = hours < 10 ? "0" + hours : hours;
    const minutesStr = minutes < 10 ? "0" + minutes : minutes;
    const secondsStr = seconds < 10 ? "0" + seconds : seconds;
    process.stdout.write("");
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);

    process.stdout.write(hoursStr + ":" + minutesStr + ":" + secondsStr);
};

export { getContractNameFromScriptFileName, arrayToUnique, logTimer, delay };
