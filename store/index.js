const RESET_FORM = 'RESET_FORM'
const SELECT_ALL = 'SELECT_ALL'
const SELECT_INVESTOR = 'SELECT_INVESTOR'
const SET_INVESTOR = 'SET_INVESTOR'
const SET_INVESTORS = 'SET_INVESTORS'
const SET_MUTED = 'SET_MUTED'
const SET_PROFILE = 'SET_PROFILE'
const SET_USER = 'SET_USER'

export const state = () => ({
    authUser: null,
    investors: [],
    muted: {},
    profile: null,
    selectedInvestorsMap: {},
})

export const getters = {
    allSelected: (state) =>
        state.investors.length > 0 &&
        Object.keys(state.selectedInvestorsMap).length ===
            state.investors.length,
    allInvestorUsernames: (state) => state.investors.map((i) => i.username),
    isLoggedIn: (state) => !!state.authUser,
    selectedInvestorUsernames: (state) =>
        Object.keys(state.selectedInvestorsMap),
    selectedInvestorCount: (state, getters) =>
        getters.selectedInvestorUsernames.length,
}

export const mutations = {
    [SELECT_ALL](state) {
        if (
            Object.keys(state.selectedInvestorsMap).length ===
            state.investors.length
        ) {
            state.selectedInvestorsMap = {}
        } else {
            state.selectedInvestorsMap = state.investors.reduce(
                (result, investor) => {
                    result[investor.username] = 1
                    return result
                },
                {},
            )
        }
    },
    [SELECT_INVESTOR](state, username) {
        if (
            Object.prototype.hasOwnProperty.call(
                state.selectedInvestorsMap,
                username,
            )
        ) {
            const { [username]: removed, ...rest } = state.selectedInvestorsMap
            state.selectedInvestorsMap = rest
        } else {
            state.selectedInvestorsMap = {
                ...state.selectedInvestorsMap,
                [username]: 1,
            }
        }
    },
    [SET_INVESTOR](state, investor) {
        const index = state.investors.findIndex((i) => i.id === investor.id)
        const investorToUpdate = state.investors.find(
            (i) => i.id === investor.id,
        )
        const updatedInvestor = { ...investorToUpdate, ...investor }
        state.investors = [
            ...state.investors.slice(0, index),
            updatedInvestor,
            ...state.investors.slice(index + 1, state.investors.length),
        ]
    },
    [SET_INVESTORS](state, investors) {
        state.investors = investors
    },
    [SET_MUTED](state, muted) {
        state.muted = muted
    },
    [SET_PROFILE](state, profile) {
        state.profile = profile
    },
    [SET_USER](state, user) {
        state.authUser = user
    },
    [RESET_FORM](state) {
        state.selectedInvestorsMap = {}
    },
}

export const actions = {
    nuxtServerInit({ commit }, { req }) {
        if (req.session?.username) {
            commit(SET_USER, req.session)
        }
    },
    async bootstrap({ commit }) {
        const { data: profile } = await this.$axios.$get('/api/me')
        commit(SET_PROFILE, profile)
        const { data: investors } = await this.$axios.$get('/api/investors')
        commit(SET_INVESTORS, investors)
        const { data: mutes } = await this.$axios.$get('/api/mutes')
        const muted = mutes.reduce((result, id) => {
            result[id] = 1
            return result
        }, {})
        commit(SET_MUTED, muted)
    },
    async mute({ commit, getters, state }) {
        await this.$axios.$post('/api/mutes/create', {
            usernames: getters.selectedInvestorUsernames,
        })
        state.investors.forEach((investor) => {
            if (
                Object.prototype.hasOwnProperty.call(
                    state.selectedInvestorsMap,
                    investor.username,
                )
            ) {
                commit(SET_INVESTOR, {
                    ...investor,
                    mutes: (investor.mutes ?? 0) + 1,
                })
                commit(SET_MUTED, {
                    ...state.muted,
                    [investor.id]: 1,
                })
            }
        })
        commit(RESET_FORM)
    },
    async logout({ commit }) {
        await this.$axios.$post('/logout')
        commit(SET_USER, null)
    },
    async undo({ commit, getters, state }) {
        await this.$axios.$post('/api/mutes/delete', {
            usernames: getters.allInvestorUsernames,
        })
        commit(SET_MUTED, {})
    },
}
