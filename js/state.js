export const players = [{hand:[],score:0,bank:0},{hand:[],score:0,bank:0}];
export let deck = [];
export let discard = [];
export let bf = [null,null];
export let turn = null;
export let drewThisTurn = [false,false];
export let discardMode = [false,false];

export function resetAll(){
  deck=[]; discard=[]; bf=[null,null]; turn=null;
  drewThisTurn=[false,false]; discardMode=[false,false];
  players[0]={hand:[],score:0,bank:0};
  players[1]={hand:[],score:0,bank:0};
}
