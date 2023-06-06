import json

from pylon.core.tools import log, web
import base64

from ..models.integration_pd import IntegrationModel


class Slot:
    integration_name = 'system_reporter_email'
    section_name = 'system'

    @web.slot(f'integrations_{section_name}_content')
    def integration_create_modal_content(self, context, slot, payload):
        with context.app.app_context():
            return self.descriptor.render_template(
                'integration/content.html',
                section_name=Slot.section_name,
            )

    @web.slot(f'integrations_{section_name}_scripts')
    def integration_create_modal_scripts(self, context, slot, payload):
        with context.app.app_context():
            return self.descriptor.render_template(
                'integration/scripts.html',
            )
