from flask import Blueprint

from CTFd.models import Challenges, Flags, db
from CTFd.plugins import register_plugin_assets_directory
from CTFd.plugins.challenges import CHALLENGE_CLASSES, BaseChallenge
from CTFd.plugins.migrations import upgrade


class ATR25Challenge(Challenges):
    __mapper_args__ = {"polymorphic_identity": "atr25_challenge"}
    id = db.Column(
        db.Integer, db.ForeignKey("challenges.id", ondelete="CASCADE"), primary_key=True
    )

class ATR25ChallengeType(BaseChallenge):
    id = "atr25_challenge"  # Unique identifier used to register challenges
    name = "atr25_challenge"  # Name of a challenge type
    templates = (
        {  # Handlebars templates used for each aspect of challenge editing & viewing
            "create": "/plugins/atr25_challenge/assets/create.html",
            "update": "/plugins/atr25_challenge/assets/update.html",
            "view": "/plugins/atr25_challenge/assets/view.html",
        }
    )
    scripts = {  # Scripts that are loaded when a template is loaded
        "create": "/plugins/atr25_challenge/assets/create.js",
        "update": "/plugins/atr25_challenge/assets/update.js",
        "view": "/plugins/atr25_challenge/assets/view.js",
    }
    # Route at which files are accessible. This must be registered using register_plugin_assets_directory()
    route = "/plugins/atr25_challenge/assets/"
    # Blueprint used to access the static_folder directory.
    blueprint = Blueprint(
        "atr25_challenge",
        __name__,
        template_folder="templates",
        static_folder="assets",
    )
    challenge_model = ATR25Challenge

    @classmethod
    def read(cls, challenge):
        challenge = ATR25Challenge.query.filter_by(id=challenge.id).first()
        data = super().read(challenge)
        return data

    @classmethod
    def update(cls, challenge, request):
        data = request.form or request.get_json()
        for attr, value in data.items():
            setattr(challenge, attr, value)

        db.session.commit()
        return challenge

    @classmethod
    def attempt(cls, challenge, request):
        status, message = super().attempt(challenge, request)
        
        flag = Flags.query.filter_by(challenge_id=challenge.id).first()
        flag_content = flag.content
        data = request.form or request.get_json()
        submission = data["submission"].strip()

        # standard wordle rules
        print("flag_content", flag_content)
        print("submission", submission)
        message += "|"

        # Track counts of characters in the flag
        flag_counts = {}
        for char in flag_content:
            flag_counts[char] = flag_counts.get(char, 0) + 1

        # First pass: Mark exact matches
        result = ["0"] * len(flag_content)
        for i in range(len(flag_content)):
            if i < len(submission) and submission[i] == flag_content[i]:
                result[i] = "2"
                flag_counts[flag_content[i]] -= 1

        # Second pass: Mark partial matches
        for i in range(len(flag_content)):
            if i < len(submission) and result[i] == "0" and submission[i] in flag_counts:
                if flag_counts[submission[i]] > 0:
                    result[i] = "1"
                    flag_counts[submission[i]] -= 1

        message += "".join(result)
        return status, message

def load(app):
    upgrade(plugin_name="atr25_challenge")
    app.db.create_all()
    CHALLENGE_CLASSES["atr25_challenge"] = ATR25ChallengeType
    register_plugin_assets_directory(
        app, base_path="/plugins/atr25_challenge/assets/"
    )