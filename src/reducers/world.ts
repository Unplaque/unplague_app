import actionList from '../data/actions.json';
import { Region } from "../model/Region";

type Action = {
  name: string,
  infection: number,
  satisfaction: number,
  costs: number,
  used: Boolean,
}

type Event = {
  title: string,
  round: number,
}

type WorldState = {
  regions: Array<Region>,
  money: number,
  round: number,
  selectedRegion?: number,
  queuedActions: Array<{action: any, regionId: number}>,
  events: Array<Event>,
  overallInfectionRate: number,
}

const initialState : WorldState = {
  regions: [],
  money: 100,
  round: 0,
  selectedRegion: undefined,
  queuedActions: [],
  events: [],
  overallInfectionRate: 0.0,
}

const world = (state = initialState, action: any) => {
  switch (action.type) {
    case "ADD_REGION":
      return Object.assign({}, state, {
        regions: [
          ...state.regions,
          action.region
        ]
      })
    case "SELECT_REGION":
      if (state.round == 0) {
        return state;
      }
      return Object.assign({}, state, {
        selectedRegion: action.regionId
      });
    case "NEXT_ROUND":
      return nextRound(state);
    case "QUEUE_ACTION":
      // error handling
      if (state.selectedRegion === undefined) {
        alert("No region selected");
        return state;
      }
      if (state.round == 0) {
        return state;
      }
      let userAction:Action = state.regions[state.selectedRegion].actionList[action.value];
      if (state.money < userAction.costs) {
        alert("You do not have enough money");
        return state;
      }
      let new_state = Object.assign({}, state, {
        money: state.money - userAction.costs,
        queuedActions: [
          ...state.queuedActions,
          {
            regionId: state.selectedRegion,
            action: userAction,
          }
        ]
      });
      new_state.regions[state.selectedRegion].actionList = state.regions[state.selectedRegion].actionList.slice();
      new_state.regions[state.selectedRegion].actionList[action.value] = Object.assign({}, userAction, {
        used: true,
      });
      return new_state;
    default:
      return state;
    }
};

function clamp(min: number, max: number, val: number) {
  return Math.max(Math.min(val, max), min);
}


function applyAction(action: Action, region: Region): Region {
  console.log("applying " + action.name + " to region " + region.name);

  // happiness can be anything between -100% (pure hate) and 200% (exaggerated happiness)
  region.happiness = clamp(-1, 2, region.happiness * (1 - (action.satisfaction / 100)))

  // infectionRate can be anything between 0% and 100%
  region.infectionModifier = clamp(0, 1, region.infectionModifier * (1 - (action.infection / 100)))

  return region;
}

function nextRound(state: WorldState): WorldState {
  // increment clock and money
  let new_state = Object.assign({}, state, {
      round: state.round + 1,
      money: state.money + 100, // constant money gain
      queuedActions: [],
  });

  // apply queued actions
  state.queuedActions.forEach(queuedAction => {
    applyAction(queuedAction.action, new_state.regions[queuedAction.regionId])
  });

  // apply effects of game events
  // ...

  // caculate new infections for every region
  new_state.regions = new_state.regions.map(oldRegion  => {
    let region:Region = Object.assign({}, oldRegion, {});

    console.log("Calculating new infections for " + region.name +  " modifier=" + oldRegion.infectionModifier + " reprod=" + oldRegion.reproductionRate);
    console.log("before: infRate=" + oldRegion.infectionRate + " lastRoundNewInfections=" + oldRegion.lastRoundNewInfections);

    let new_infections = region.lastRoundNewInfections * region.reproductionRate * region.infectionModifier;
    region.lastRoundNewInfections = new_infections;

    region.infectionRate = Math.min(region.infectionRate + (new_infections / region.population), 1);

    console.log("after: newInfections=" + new_infections + " infRate=" + region.infectionRate);

    return region;
  });

  // apply fixed new infections
  if (new_state.round == 1) {
    // assign initial infection
    new_state.regions[0].infectionRate = 0.2;

    new_state.events= [
      ...state.events,
      { title: "Initial Infection in Asia", round: new_state.round },
      //{ title: "Initial Infection in Europe", round: new_state.round },
    ];
    new_state.regions[0].lastRoundNewInfections = new_state.regions[0].infectionRate * new_state.regions[0].population;
  }

  // calculate total injection rate
  let infectedPopulation = 0;
  let totalPopulation = 0;
  new_state.regions.forEach((region) => {
    totalPopulation += region.population;
    infectedPopulation += (region.infectionRate * region.population);
  });
  new_state.overallInfectionRate = infectedPopulation / totalPopulation;
  return new_state;
}

export default world;
  