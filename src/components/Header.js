import React, { PureComponent } from 'react'

import { connect } from '@obsidians/redux'
import { IpcChannel } from '@obsidians/ipc'

import headerActions, { Header, NavGuard } from '@obsidians/header'
import { networkManager, networks } from '@obsidians/network'
import { actions } from '@obsidians/workspace'

import { List } from 'immutable'
class HeaderWithRedux extends PureComponent {
  state = {
    networkList: List()
  }

  componentDidMount () {
    actions.history = this.props.history
    headerActions.history = this.props.history
    this.refresh()
    this.navGuard = new NavGuard(this.props.history)
  }

  componentDidUpdate(prevProps) {
    if (prevProps.network && prevProps.network !== this.props.network) {
      this.refresh()
    }
  }

  async refresh () {
    if (process.env.DEPLOY === 'bsn') {
      try {
        const ipc = new IpcChannel('bsn')
        const projects = await ipc.invoke('projects', { chain: 'algo' })
        this.setState({
          networkList: List(projects.map(project => {
            const url = project.endpoints?.find(endpoint => endpoint.startsWith('http'))
            return {
              id: `bsn${project.network.id}`,
              group: 'BSN',
              name: `${project.network.name}`,
              fullName: `${project.network.name} - ${project.name}`,
              icon: 'fas fa-globe',
              notification: `Switched to <b>${project.name}</b>.`,
              url,
            }
          }))
        }, this.setNetwork)
      } catch (error) {
        console.log(error)
      }
    } else {
      this.setState({
        networkList: List(networks)
      }, this.setNetwork)
    }
  }

  setNetwork () {
    if (!networkManager.network) {
      networkManager.setNetwork(this.state.networkList.get(0))
    }
  }

  networkList = networksByGroup => {
    const networkList = []
    const groups = networksByGroup.toJS()
    const keys = Object.keys(groups)
    keys.forEach((key, index) => {
      if (key !== 'default') {
        networkList.push({ header: key })
      }
      const networkGroup = groups[key].sort((b, a) => b.name < a.name ? -1 : 1)
      networkGroup.forEach(network => networkList.push(network))
      if (index !== keys.length - 1) {
        networkList.push({ divider: true })
      }
    })
    return networkList
  }

  render () {
    console.debug('[render] HeaderWithRedux')
    const { profile, projects, contracts, accounts, network } = this.props

    const selectedProject = projects.get('selected')?.toJS() || {}

    const networkGroups = this.state.networkList.groupBy(n => n.group)
    const networkList = this.networkList(networkGroups)
    const selectedNetwork = this.state.networkList.find(n => n.id === network) || {}

    const starred = accounts.getIn([network, 'accounts'])?.toJS() || []
    const selectedContract = contracts.getIn([network, 'selected']) || ''
    const selectedAccount = accounts.getIn([network, 'selected']) || ''

    return (
      <Header
        profile={profile}
        projects={projects.get('local').toJS()}
        selectedProject={selectedProject}
        selectedContract={selectedContract}
        selectedAccount={selectedAccount}
        starred={starred}
        network={selectedNetwork}
        networkList={networkList}
      />
    )
  }
}

export default connect([
  'profile',
  'projects',
  'contracts',
  'accounts',
  'network',
])(HeaderWithRedux)
