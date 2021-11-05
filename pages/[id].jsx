import styles from './contest-page.module.css';
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import cloneDeep from 'lodash/cloneDeep';
import { ToastContainer, toast } from 'react-toastify';
import Select from 'react-select';
import 'react-toastify/dist/ReactToastify.min.css';

const playerBlockHeight = 72;

export default function Contest(props) {
    const {
        id,
        players,
        contests,
        winner,
    } = props;

    const [playersLocal, setPlayersLocal] = useState(players);
    const [contestsLocal, setContestsLocal] = useState(contests);
    const [activePlayerId, setActivePlayer] = useState(playersLocal[0].id);
    const [isSaving, setIsSaving] = useState(false);
    const [winnerId, setWinnerId] = useState(winner);

    const maxPlayersId = useMemo(() => {
        return Math.max(...playersLocal.map(player => player.id));
    }, [playersLocal]);

    const getPlayerById = useCallback((id) =>
        playersLocal.find(player => player.id === id),
        [playersLocal]);

    const contestsLayers = useMemo(() => {
        const result = [];

        let currentNode = contestsLocal;
        result.push(currentNode.items.slice());

        while (currentNode.children) {
            currentNode = currentNode.children;
            result.push(currentNode.items.slice());
        }

        return result;
    }, [contestsLocal, playersLocal]);

    const handlePlayerChosen = useCallback((e) => {
        setActivePlayer(Number(e.target.value));
    }, [setActivePlayer]);

    const handlePlayerChange = useCallback((e, player) => {
        const name = e.target.value;

        setPlayersLocal((prevState) => {
            if (player) {
                const index = prevState.findIndex(p => p.id === player.id);
                const updatedPlayer = cloneDeep(prevState[index]);

                updatedPlayer.name = e.target.value;

                const newPlayers = prevState.slice();

                newPlayers.splice(index, 1, updatedPlayer);

                return newPlayers;
            } else {
                const newPlayers = prevState.slice();
                const id = maxPlayersId + 1;
                const rating = 0;

                const newPlayer = {
                    id,
                    name,
                    rating,
                }

                newPlayers.push(newPlayer);

                return newPlayers;
            }
        })
    }, [maxPlayersId]);

    const activePlayer = useMemo(() => {
        return playersLocal.find(player => player.id === activePlayerId);
    }, [playersLocal, activePlayerId]);

    const handleWinnerChange = useCallback((e, layer) => {
        const playerId = Number(e.target.value);

        if (layer === contestsLayers.length - 1) {
            setWinnerId(playerId);
            return;
        }

        const indexInFirstContest = contestsLocal.items.findIndex(contest => contest.player1 === playerId || contest.player2 === playerId);
        const indexInNextContests = Math.floor(indexInFirstContest / (2 ** (layer + 1)));
        const isFirst = indexInFirstContest % (2 ** (layer + 1)) < (2 ** (layer + 1)) / 2;

        setContestsLocal((prevState) => {
            const newContestsLocal = cloneDeep(prevState);

            let currentNode = newContestsLocal;

            for (let i = 0; i < layer; i++) {
                currentNode = currentNode.children;
            }

            const currentContests = currentNode.children;
            const contest = currentContests.items[indexInNextContests];

            if (isFirst) {
                contest.player1 = playerId;
            } else {
                contest.player2 = playerId;
            }

            return newContestsLocal;
        });

    }, [playersLocal, contestsLocal]);

    const handleSave = useCallback(() => {
        setIsSaving(true);

        const newData = {
            players: playersLocal,
            contests: contestsLocal,
            winner: winnerId,
        };

        const body = {
            data: newData,
            id,
        }

        fetch('/api/save', {method: 'POST', body: JSON.stringify(body)})
            .then(() => {
                setTimeout(() => {
                    setIsSaving(false);
                }, 500);

                toast.success('Успешно сохранено!', {hideProgressBar: true});
            })
            .catch(() => {
                toast.success('Что-то пошло не так :(', {hideProgressBar: true});
            });
    }, [contestsLocal, playersLocal, winnerId, setIsSaving]);

    const allSelectOptions = useMemo(() => {
        return playersLocal
            .map(playerObj => ({value: playerObj.id, label: playerObj.name}));
    }, [playersLocal]);

    const handleParticipantChange = useCallback((id, i, isFirst) => {
        setContestsLocal((prevState) => {
            const newContestsLocal = cloneDeep(prevState);

            const contest = newContestsLocal.items[i];

            if (isFirst) {
                contest.player1 = id;
            } else {
                contest.player2 = id;
            }

            return newContestsLocal;
        })
    }, [setContestsLocal]);

    const isWinner = useCallback((playerId, layer) => {
        if (layer === contestsLayers.length - 1) {
            return winnerId === playerId;
        }

        return contestsLayers[layer + 1].some(contest => contest.player1 === playerId || contest.player2 === playerId);
    }, [contestsLayers, winnerId]);

    useEffect(() => {
        setWinnerId(null);
    }, [contestsLocal]);

    return (
        <div className={styles['contest-page']}>
            <div className={styles['header']}>
                <div className={styles['header-content']}>
                    Vezdekod Contest
                </div>
            </div>
            <div className={styles['players']}>
                <div className={styles['players-list']}>
                    {playersLocal.map(player => {
                        return (
                            <React.Fragment key={player.id}>
                                <input
                                    type="radio"
                                    id={player.id.toString()}
                                    value={player.id}
                                    checked={player.id === activePlayerId}
                                    onChange={handlePlayerChosen}
                                    className={styles['player-input']}
                                />
                                <label
                                    htmlFor={player.id.toString()}
                                    className={styles['player-input-label']}
                                    key={player.id}
                                >
                                    {player.name}
                                </label>
                            </React.Fragment>
                        );
                    })}
                </div>
                <div className={styles['editor']}>
                    <input
                        className={styles['name-input']}
                        value={activePlayer?.name || ''}
                        placeholder="Название команды"
                        onChange={(e) => handlePlayerChange(e, activePlayer)}
                    />
                </div>
            </div>
            <div className={styles['contests']}>
                {contestsLayers.map((contestsArr, i) => {
                    const key = contestsArr.map(contest => contest.id).join('-');
                    const offset = i === 0 ? 0 : (2 ** (i) - 1) * playerBlockHeight;
                    const negativeOffset = i === 0 ? 0 : (i - 0.5) * playerBlockHeight;
                    const isFirst = i === 0;

                    return (
                        <div className={styles['layer']} key={key} style={{marginTop: `-${negativeOffset}px`}}>
                            {contestsArr.map((contest, j) => {
                                const player1 = getPlayerById(contest.player1);
                                const player2 = getPlayerById(contest.player2);

                                const player1Option = allSelectOptions.find(option => option.value === contest.player1);
                                const player2Option = allSelectOptions.find(option => option.value === contest.player2);

                                return (
                                    <React.Fragment key={contest.id}>
                                        <div className={styles['players-pair']} style={{marginTop: `${offset}px`}}>
                                            <div className={styles['players-pair-container']}>
                                                <div className={styles['player']}>
                                                    <div className={styles['player-wrapper']}>
                                                        <input
                                                            disabled={!player1}
                                                            className={styles['player-winner-radio-input']}
                                                            type="radio"
                                                            value={player1?.id}
                                                            id={`${i}-${player1?.id}`}
                                                            checked={isWinner(player1?.id, i)}
                                                            onChange={(e) => handleWinnerChange(e, i)}
                                                        />
                                                        <label
                                                            className={styles['player-winner-radio-button']}
                                                            htmlFor={`${i}-${player1?.id}`}
                                                        />
                                                        {isFirst
                                                            ? (
                                                                <Select
                                                                    options={allSelectOptions}
                                                                    placeholder="Выберите"
                                                                    {...(player1Option ? { value: player1Option } : {})}
                                                                    onChange={(e) => handleParticipantChange(e.value, j, true)}
                                                                />
                                                            )
                                                            : player1 ? player1.name : null}
                                                    </div>
                                                </div>
                                                <div className={styles['player']} style={{marginTop: `${offset}px`}}>
                                                    <div className={styles['player-wrapper']}>
                                                        <input
                                                            disabled={!player2}
                                                            className={styles['player-winner-radio-input']}
                                                            type="radio"
                                                            value={player2?.id}
                                                            id={`${i}-${player2?.id}`}
                                                            checked={isWinner(player2?.id, i)}
                                                            onChange={(e) => handleWinnerChange(e, i)}
                                                        />
                                                        <label
                                                            className={styles['player-winner-radio-button']}
                                                            htmlFor={`${i}-${player2?.id}`}
                                                        />
                                                        {isFirst
                                                            ? (
                                                                <Select
                                                                    options={allSelectOptions}
                                                                    placeholder="Выберите"
                                                                    {...(player2Option ? { value: player2Option } : {})}
                                                                    onChange={(e) => handleParticipantChange(e.value, j, false)}
                                                                />
                                                            )
                                                            : player2 ? player2.name : null}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className={styles['branches']}>
                                                <div className={styles['branches-horizontal']} />
                                                <div className={styles['branch-vertical']} />
                                                <div className={styles['branch-middle']} />
                                            </div>
                                        </div>
                                    </React.Fragment>
                                )
                            })}
                        </div>
                    );
                })}
                <div className={styles['winner-layer']}>
                    <div className={styles['player']}>
                        <div className={styles['player-wrapper']}>
                            <div className={styles['crown-icon']} />
                            <div>{winnerId ? getPlayerById(winnerId).name : null}</div>
                        </div>
                    </div>
                </div>
            </div>
            <div className={styles['buttons']}>
                <button className={styles['save-button']} onClick={handleSave}>
                    {isSaving ? <div className={styles['spinner']}></div> : null}
                    Сохранить
                </button>
            </div>
            <ToastContainer />
        </div>
    );
}

export async function getServerSideProps({params}) {
    const {id} = params;

    try {
        const data = require(`../db/${id}.json`);

        return {props: {...data, id}};
    } catch {
        const template = require(`../assets/template.json`);

        return {props: {...template, id}};
    }

}
