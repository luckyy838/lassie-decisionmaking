import os
import sys
import math

# Frontend util.ts expects the newFlask multi-objective API (final_suggestion, info_gaussian, etc.)
_NEW_FLASK_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'newFlask'))
if _NEW_FLASK_DIR not in sys.path:
    sys.path.insert(0, _NEW_FLASK_DIR)

from multiObjectiveDecisionMaking.decision_making import *
from multiObjectiveDecisionMaking.multi_objective_tools import *

from flask import Flask, request, jsonify
from flask_cors import CORS, cross_origin
import numpy as np

app = Flask(__name__)
CORS(app)
app.config['CORS_HEADERS'] = 'Content-Type'

reported_balance_type = {
    0: 'selecting locations that optimizes the objective of increasing information coverage based on data from previously sampled locations',
    0.25: 'hierarchically weighting sampling locations that foremost satisfy the objective of increasing information coverage and, to a lesser extent, the objective of investigating the discrepancy',
    0.5: 'evenly weighting sampling locations that satisfy both objectives of increasing information coverage and investigating the discrepancy',
    0.75: 'hierarchically weighting sampling locations that foremost satisfy the objective of investigating the discrepancy and, to a lesser extent, the objective of increasing information coverage',
    1: 'selecting locations that optimizes the objective of investigating the discrepancy based on data from previously sampled locations',
}

exception_list = {
    0: 'Because the robot notices the overall current information coverage is low and undertainty is high',
    1: 'Because the robot notices that there are locations where the data is at high discrepancy with the hypothesis',
    2: 'Because the robot notices that there are locations with low information coverage and the discrepancy between the hypothesis and incoming data is not that obvious',
    3: 'Because the robot notices that overall information level is high and undertainty is low',
}

k_info_signal_ = 0.5
k_noise_ = 2
k_info_low_ = 0.27
k_info_high_ = 0.7
NUM_WAYPOINTS = 22
NUM_FINE_POINTS = 100


def hundred_index_to_waypoint(i):
    """Map a 100-grid index (0-99) onto the same 22 waypoint bins the frontend uses."""
    return min(int(math.floor((int(i) * 21) / 99.0)), NUM_WAYPOINTS - 1)


def aggregate_max_100_to_22(values_100):
    """Each 22-bin reward is the max of the fine-grid values that fall in that bin."""
    values_100 = np.asarray(values_100, dtype=float).reshape(-1)
    buckets = [[] for _ in range(NUM_WAYPOINTS)]
    for i, value in enumerate(values_100[:NUM_FINE_POINTS]):
        buckets[hundred_index_to_waypoint(i)].append(value)
    return np.array([np.max(bucket) if bucket else 0.0 for bucket in buckets])


def visited_waypoint_mask(location):
    mask = np.zeros(NUM_WAYPOINTS, dtype=bool)
    for loc in np.atleast_1d(location):
        loc = int(loc)
        if 0 <= loc < NUM_WAYPOINTS:
            mask[loc] = True
    return mask


def remap_unvisited(sub_index, unvisited_idx):
    sub_index = int(sub_index)
    if sub_index < 0 or sub_index >= len(unvisited_idx):
        return int(unvisited_idx[0])
    return int(unvisited_idx[sub_index])


def winning_hundred_index(values_100, waypoint):
    best_i = 0
    best_v = -np.inf
    for i, value in enumerate(np.asarray(values_100, dtype=float).reshape(-1)[:NUM_FINE_POINTS]):
        if hundred_index_to_waypoint(i) == waypoint and value > best_v:
            best_v = value
            best_i = i
    return best_i


@app.route('/process', methods=['POST'])
@cross_origin()
def process():
    inputs = request.get_json(force=True)
    location = np.array(inputs['locations'], dtype=np.int64)
    location_norm = location / 21

    sample = np.array(inputs['measurements'])
    mm = np.array(inputs['moistureValues'])
    erodi = np.array(inputs['shearValues'])
    multi_objective_pattern = np.array(inputs['objective_repre'])

    DM = DecisionMaking()
    DM.update_current_state(location_norm, sample, mm, erodi)
    info_gaussian, information_level, info_signal = DM.handle_spatial_information_gaussian()
    disp_gaussian, feature_gaussian, noise_esti, disp_signal, xx_model, \
        gasussian_prediction, gaussian_uncertainty = DM.handle_discrepancy_direct_gaussian()

    info_22 = aggregate_max_100_to_22(info_gaussian)
    disp_22 = aggregate_max_100_to_22(disp_gaussian)
    reward_vector_22 = np.vstack((info_22, disp_22)).T

    visited = visited_waypoint_mask(location)
    unvisited_idx = np.flatnonzero(~visited)
    if len(unvisited_idx) == 0:
        unvisited_idx = np.arange(NUM_WAYPOINTS)

    reward_for_opt = reward_vector_22[unvisited_idx]
    final_type, final_suggestion_sub, suggestion_sets_sub, except_index, pareto_sets, pareto_locs = run_multi_objective_odsf(
        reward_for_opt, information_level, multi_objective_pattern,
        info_signal, disp_signal, noise_esti,
        k_info_signal=k_info_signal_, k_noise=k_noise_, k_info_low=k_info_low_, k_info_high=k_info_high_,
    )

    final_suggestion = remap_unvisited(final_suggestion_sub, unvisited_idx)
    suggestion_sets = np.array([remap_unvisited(s, unvisited_idx) for s in np.atleast_1d(suggestion_sets_sub)])
    combined_100 = np.asarray(info_gaussian, dtype=float).reshape(-1) + np.asarray(disp_gaussian, dtype=float).reshape(-1)
    final_suggestion_index100 = winning_hundred_index(combined_100, final_suggestion)

    output = {
        'final_type': final_type,
        'final_suggestion': str(final_suggestion),
        'final_suggestion_index100': str(final_suggestion_index100),
        'suggestion_sets': suggestion_sets.tolist(),
        'info_gaussian': info_gaussian.tolist(),
        'disp_gaussian': disp_gaussian.tolist(),
        'information_level': information_level,
        'info_signal': info_signal,
        'noise_esti': noise_esti,
        'disp_signal': disp_signal,
    }

    print('robot suggests waypoint:', final_suggestion, 'visited excluded:', np.flatnonzero(visited).tolist())
    return jsonify(output)


if __name__ == '__main__':
    app.run(debug=True)
