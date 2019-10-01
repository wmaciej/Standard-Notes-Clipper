const { Component, h, render } = window.preact

const FormField = (props) => {
  return h('div', { className: 'form-group'},
    h('label', { for: props.name }, props.label),
    h('input', { onChange: (event) => props.onChange(event), required: props.required, name: props.name, id: props.name, type: props.type, placeholder: props.placeholder, className: 'form-control', value: props.value }, props.for)
  )
}

class Login extends Component {
  constructor (props) {
    super(props)
    this.state = {
      email: '',
      password: '',
      error: null,
      loggingIn: false,
      twofaKey: null,
      twofaCode: '',
    }
  }

  login (event) {
    event.preventDefault()
    this.setState({
      loggingIn: true,
      error: null
    })
    const extraParams = {}
    if (this.state.twofaKey) {
      extraParams[this.state.twofaKey] = this.state.twofaCode
    }
    chrome.extension.getBackgroundPage().login(this.state.email, this.state.password, extraParams)
      .then(response => {
        if (response && (response.tag === 'mfa-required' || response.tag === 'mfa-invalid')) {
          this.setState({
            twofaKey: response.payload.mfa_key,
            twofaCode: '',
            loggingIn: false,
            error: response.message
          })
        } else {
          this.props.stateChanged()
        }
      })
      .catch(err => {
        this.setState({
          twofaKey: null,
          twofaCode: '',
          loggingIn: false,
          error: err.message
        })
        console.error(err)
      })
    return false
  }

  renderLoginForm (title, fields, button) {
    return h('div', { className: 'col-lg-5' },
      h('form', { className: 'card', onSubmit: (event) => this.login(event) },
        h('div', { className: 'card-body' },
          h('h1', { className: 'text-center' }, title),
          this.state.error ? h('div', { role: 'alert', className: 'alert alert-danger'}, this.state.error) : null,
          h('div', {}, fields),
          h('button', {className: 'btn btn-primary btn-block', disabled: this.state.loggingIn, type: 'submit', onClick: (event) => this.login(event)}, button)
        )
      )
    )
  }

  render () {
    const title = this.state.twofaKey ? 'Two Factor Authentication' : 'Login'
    const fields = this.state.twofaKey ? [
      h(FormField, { required: true, name: 'code', label: 'Code', type: 'text', value: this.state.twofaCode, onChange: (event) => this.setState({twofaCode: event.target.value}) })
    ] : [
      h(FormField, { required: true, name: 'email', label: 'E-mail', type: 'email', value: this.state.email, onChange: (event) => this.setState({email: event.target.value}) }),
      h(FormField, { required: true,  name: 'password', label: 'Password', type: 'password', value: this.state.password, onChange: (event) => this.setState({password: event.target.value}) }),
    ]
    const button = this.state.twofaKey ? 'Submit' : 'Login'
    return this.renderLoginForm(title, fields, button)
  }
}

class Logout extends Component {
  logout () {
    chrome.extension.getBackgroundPage().logout().then(() => this.props.stateChanged())
  }

  render () {
    return h('div', {className: 'text-center'},
      h('p', {}, 'Logged in to Standard Notes!'),
      h('button', {className: 'btn btn-primary', onClick: () => this.logout()}, 'Logout')
    )
  }
}

class SettingsPage extends Component {
  constructor (props) {
    super(props)
    this.state = {
      mode: null
    }
  }

  componentDidMount () {
    this.checkState()
  }

  checkState () {
    chrome.storage.sync.get({
      token: null,
      params: null,
      keys: null
    }, items => {
      if (items.token === null || items.params === null || items.keys === null) {
        this.setState({ mode: 'login' })
      } else {
        this.setState({ mode: 'logout' })
      }
    })
  }

  renderStateElement () {
    switch (this.state.mode) {
      case 'login':
        return h(Login, { stateChanged: () => this.checkState() })
      case 'logout':
        return h(Logout, { stateChanged: () => this.checkState() })
      default:
        return null
    }
  }

  render () {
    return h('div', { className: 'container' },
      h('div', { className: 'row justify-content-md-center' },
        this.renderStateElement()
      )
    )
  }
}

render(h(SettingsPage), document.getElementById('options'))