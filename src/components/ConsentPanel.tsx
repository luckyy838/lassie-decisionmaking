import * as React from "react";
import { useState } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Radio from '@material-ui/core/Radio';
import RadioGroup from '@material-ui/core/RadioGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormControl from '@material-ui/core/FormControl';
import FormLabel from '@material-ui/core/FormLabel';

interface ConsentPanelProps {
    onCompletion: () => void
}

const consentPdf = require('../../assets/LASSIE_Simulated_Scenario_Consent.pdf');

const useStyles = makeStyles({
    container: {
        width: '100%',
        height: '100%',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column'
    },
    iframe: {
        width: '100%',
        flex: 1,
        minHeight: 0,
        border: 'none'
    },
    consentButtonRow: {
        marginTop: 16,
        flexShrink: 0
    },
    title: {
        fontFamily: 'Helvetic, sans-serif',
        color: '#114B5F',
        fontSize: 32,
        margin: 0
    },
    subtitle: {
        fontFamily: 'Helvetic, sans-serif',
        color: '#256c85',
        fontSize: 16,
        marginTop: 4,
        marginBottom: 8
    },
    formControl: {
        minHeight: 108
    }
});

const consentPrompt = [
    'I affirm that I am at least 18 years old.',
    'By clicking “I agree" I consent to this study. I may withdraw at any time.'
];

const consentOptions = [
    'Yes', 'No',
    'I agree', 'I decline'
];

export default function ConsentPanel(props: ConsentPanelProps) {
    const styles = useStyles();
    // Step = 0 for age, 1 for agreement
    const [step, setStep] = useState(0);
    const [confirm, setConfirm] = useState('false');
    const onConfirm = (accepted) => {
        setConfirm(accepted);
        if (accepted === 'true') {
            if (step === 0) {
                setStep(1);
                setConfirm('false');
            } else {
                props.onCompletion();
            }
        }
    }

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>Research Consent Form</h1>
            <h2 className={styles.subtitle}>Legged Autonomous Surface Science in analog Environments (LASSIE)</h2>
            <iframe className={styles.iframe} src={`${consentPdf}#toolbar=0`}></iframe>
            <div className={styles.consentButtonRow}>
                {
                    <FormControl className={styles.formControl} component="fieldset">
                        <FormLabel component="legend">{consentPrompt[step]}</FormLabel>
                        <RadioGroup name="consent" value={confirm} onChange={ev => onConfirm(ev.target.value)}>
                            <FormControlLabel value="true" control={<Radio />} label={consentOptions[step * 2]} />
                            <FormControlLabel value="false" control={<Radio />} label={consentOptions[(step * 2) + 1]} />
                        </RadioGroup>
                    </FormControl>
                }
            </div>
        </div>
    )
}