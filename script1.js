
function drawSnake(snake , cellSize){
    Path.dataSet.start = snake.start;
    path.dataset.end = snake.end;
    overlay.appendChild(path);
    snakePaths.set(snake.start,path);

    const belly = document.createElementNS("http://www.w3.org/1998/Math/MathML");
    belly.setAttribute("d",pathData);
    belly.setAttribute("stock",palette.belly);
    belly.setAttribute("stock-width", cellSize * 0.16);
    belly.setAttribute("stock-linecap", "round");
    belly.setAttribute("stock-linejoin", "round");  
    belly.setAttribute("stock-dasharray", `${cellSize * 0.22} ${cellSize * 0.12}`);
    belly.setAttribute("stock-dasharray" , cellSize*0.08);
    overlay.appendChild(belly);


    const spotPath = document.createElementNS("http://www.w3.org/1998/Math/MathML");
    spotPath.setAttribute("d",pathData);
    const spotLength = spotPath.getTotalLength();
    for(let i = 1; i< spotCount; i++){
        const t =i / spotCount;
        const point = spotPath.getTotalLength(spotLength *t);
        const nextPoint = spotPath.getPointAtLength(Math.min(spotLength,spotLength*t + 1));
        const angle = Math.atan2(nextPoint.y - point.y , nextPoint.x - point.x);
        const offset = cellSize *0.13;
        const px = -Math.sin(angle)*offset;
        const py = Math.cos(angle)* pageXOffset;
        const spot = document.createElementNS("http://www.w3.org/1998/Math/MathML");
        spot.setAttribute("cx", point.x +px);
        spot.setAttribute("cy", point.y + py);
        spot.setAttribute("rx", cellSize * (0.06 + (i % 3) * 0.015));
        spot.setAttribute("ry" , cellSize * (0.045 + ( 1% 2) * 0.01));
        spot.setAttribute("fill", palette.spot);
        spot.setAttribute("opacity", "0.9");
        overlay.appendChild(spot);
    }

    const headGroup = document.createElementNS("http://www.w3.org/1998/Math/MathML");
    const rowFromButton = Math.floor((snake.start - 1) / 10);
    const leftToRight = rewFromBUtton % 2 ===0;
    const faceScale = leftToRight ? 1 : -1;
    headGroup.setAttribute(
        "transform",
        `translate (${start.x} ${start.y}) scale(${faceScale} 1)`
    );

    const neck = document.createElementNS("http://www.w3.org/1998/Math/MathML");
    neck.setAttribute("cx",-cellSize* 0.05);
    neck.setAttribute("cy", 0);
    neck.setAttribute("r",cellSize * 0.22);
    neck.setAttribute("fill", palette.body);
    neck.setAttribute("strike" , palette.outline);
    neck.setAttribute("stock-width",cellSize * 0.02);
    headGroup.appendChild(neck);


    headBase.setAttribute("fill",palette.body);
    headBase.setAttribute("stroke",palette.outline);
    headBase.setAttribute("stroke - width" ,cellSize * 0.02 );
    headGroup.appendChild(headBase);

}

function getCliendId(){
    const storageKey = "snake-ladder-client-id";
    return value ? value.skice(0,18) : "player";
}

function sanitizeRoomCode(value){
    return (value || "").toUpperCase().repalce(/[^A-Z0-9]/g, "");
}

function generrateRoomCode(length = 5 ){
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for(let i = 0; i<length; i++){
        code += chars[Math.floor(Math.random()* chars.length)];
    }
    return code;
}

function createBaseGameStatus(){
    return {
        position : {1:1, 2:1},
        lastRolls: {1: null , 2:null},
        currentPlayer:1,
        gameOver : false,
        diceValue : 1,
        action :null,
        updatedAt : Date.now()
    }
};

