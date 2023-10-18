const EmailBaseModal = {
    delimiters: ['[[', ']]'],
    props: [
        'instance_name', 'display_name', 'logo_src', 'section_name',
    ],
    emits: ['update'],
    components: {
        SecretFieldInput: SecretFieldInput
    },
    template: `
<div
        :id="modal_id"
        class="modal modal-small fixed-left fade shadow-sm" tabindex="-1" role="dialog"
        @dragover.prevent="modal_style = {'height': '300px', 'border': '2px dashed var(--basic)'}"
        @drop.prevent="modal_style = {'height': '100px', 'border': ''}"
>
    <ModalDialog
            v-model:name="config.name"
            v-model:is_default="is_default"
            v-model:is_shared="config.is_shared"
            @update="update"
            @create="create"
            :display_name="display_name"
            :id="id"
            :is_fetching="is_fetching"
            :is_default="is_default"
    >
        <template #body>
            <div class="form-group">
                <div class="mb-3">
                    <p class="font-h5 font-semibold mb-1">Host</p>
                    <input type="text" v-model="host" class="form-control form-control-alternative"
                           placeholder="SMTP host"
                           :class="{ 'is-invalid': error.host }">
                    <div class="invalid-feedback">[[ error.host ]]</div>
                </div>
                
                <div class="mb-3">
                    <p class="font-h5 font-semibold mb-1">Port</p>
                    <input type="number" class="form-control form-control-alternative" placeholder="SMTP port"
                           v-model="port"
                           :class="{ 'is-invalid': error.port }"
                    >
                    <div class="invalid-feedback">[[ error.port ]]</div>
                </div>
        
                <div class="mb-3">
                    <p class="font-h5 font-semibold mb-1">User</p>
                    <input type="text" class="form-control form-control-alternative"
                           v-model="user"
                           placeholder="SMTP user"
                           :class="{ 'is-invalid': error.user }">
                    <div class="invalid-feedback">[[ error.user ]]</div>
                </div>
                <div class="mb-3">
                    <p class="font-h5 font-semibold mb-1">Password</p>
                    <SecretFieldInput
                        v-model="passwd"
                        placeholder="SMTP password"
                    />
                    <div v-show="error.passwd" class="invalid-feedback" style="display: block">[[ error.passwd ]]</div>
                </div>
                
                <p class="font-h5 font-semibold">Sender<span class="text-gray-600 font-h6 font-weight-400 ml-1">(optional)</span></p>
                <p class="font-h6 font-weight-400 mb-2">By default emails are sent from SMTP user</p>
                <input type="text" class="form-control form-control-alternative"
                       v-model="sender"
                       placeholder="Email sender"
                       :class="{ 'is-invalid': error.sender }">
                <div class="invalid-feedback">[[ error.sender ]]</div>
            </div>
        </template>
        <template #footer>
            <test-connection-button
                    :apiPath="this.$root.build_api_url('integrations', 'check_settings') + '/' + pluginName"
                    :error="error.check_connection"
                    :body_data="body_data"
                    v-model:is_fetching="is_fetching"
                    @handleError="handleResponseError"
            >
            </test-connection-button>
        </template>
    </ModalDialog>
</div>
    `,
    data() {
        return this.initialState()
    },
    mounted() {
        this.modal.on('hidden.bs.modal', e => {
            this.clear()
        })
    },
    computed: {
        project_id() {
            // return getSelectedProjectId()
            return this.$root.project_id
        },
        body_data() {
            const {
                host,
                port,
                user,
                passwd,
                sender,
                config,
                is_default,
                project_id,
                status,
            } = this
            return {
                host, port, user, passwd, sender, config, is_default,
                project_id, status, mode: this.$root.mode,
            }
        },
        modal() {
            return $(this.$el)
        },
        modal_id() {
            return `${this.instance_name}_integration`
        }
    },
    watch: {
        type() {
            this.$nextTick(this.refresh_pickers)
        }
    },
    methods: {
        clear() {
            Object.assign(this.$data, this.initialState())
        },
        load(stateData) {
            Object.assign(this.$data, stateData)
        },
        handleEdit(data) {
            const {config, is_default, id, settings} = data
            this.load({...settings, config, is_default, id})
            this.modal.modal('show')
        },
        async handleDelete(id) {
            this.load({id})
            await this.delete()
        },
        async handleSetDefault(id, local=true) {
            this.load({id})
            await this.set_default(local)
        },
        handleError(error_data) {
            error_data.forEach(item => {
                this.error = {[item.loc[0]]: item.msg}
            })
        },
        refresh_pickers() {
            $(this.$el).find('.selectpicker').selectpicker('redner').selectpicker('refresh')
        },
        async handleResponseError(response) {
            try {
                const error_data = await response.json()
                this.handleError(error_data)
            } catch (e) {
                window.alertMain.add(e, 'danger-overlay')
            }
        },
        async create() {
            this.is_fetching = true
            try {
                console.log('Email reporter created!')
                const resp = await fetch(this.api_url + this.pluginName, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(this.body_data)
                })
                if (resp.ok) {
                    this.modal.modal('hide')
                    this.$emit('update', {...this.$data, section_name: this.section_name})
                } else {
                    const error_data = await resp.json()
                    this.handleError(error_data)
                }
            } catch (e) {
                console.error(e)
                showNotify('ERROR', 'Error creating reporter email')
            } finally {
                this.is_fetching = false
            }
        },
        async update() {
            this.is_fetching = true
            try {
                const resp = await fetch(this.api_url + this.id, {
                    method: 'PUT',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(this.body_data)
                })
                if (resp.ok) {
                    this.modal.modal('hide')
                    this.$emit('update', {...this.$data, section_name: this.section_name})
                } else {
                    const error_data = await resp.json()
                    this.handleError(error_data)
                }
            } catch (e) {
                console.error(e)
                showNotify('ERROR', 'Error updating reporter email')
            } finally {
                this.is_fetching = false
            }
        },
        async delete() {
            this.is_fetching = true
            try {
                const resp = await fetch(this.api_url + this.project_id + '/' + this.id, {
                    method: 'DELETE',
                })
                if (resp.ok) {
                    this.$emit('update', {...this.$data, section_name: this.section_name})
                } else {
                    const error_data = await resp.json()
                    this.handleError(error_data)
                    alertMain.add(`
                        Deletion error. 
                        <button class="btn btn-primary" 
                            @click="registered_components?.${this.instance_name}?.modal.modal('show')"
                        >
                            Open modal
                        <button>
                    `)
                }
            } catch (e) {
                console.error(e)
                showNotify('ERROR', 'Error deleting reporter email')
            } finally {
                this.is_fetching = false
            }
        },
        async set_default(local) {
            this.is_fetching = true
            try {
                const resp = await fetch(this.api_url + this.project_id + '/' + this.id, {
                    method: 'PATCH',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({local})
                })
                if (resp.ok) {
                    this.$emit('update', {...this.$data, section_name: this.section_name})
                } else {
                    const error_data = await resp.json()
                    this.handleError(error_data)
                }
            } catch (e) {
                console.error(e)
                showNotify('ERROR', 'Error setting as default')
            } finally {
                this.is_fetching = false
            }
        },

        initialState: () => ({
            modal_style: {'height': '100px', 'border': ''},
            host: '',
            port: null,
            user: '',
            passwd: '',
            sender: '',
            config: {},
            is_default: false,
            is_fetching: false,
            error: {},
            id: null,
            pluginName: 'email_base',
            status: integration_status.pending,
            api_url: V.build_api_url('integrations', 'integration') + '/',
            type: '',
        })
    }
}

register_component('EmailBaseModal', EmailBaseModal)
