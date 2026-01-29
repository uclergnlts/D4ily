{{/*
Expand the name of the chart.
*/}}
{{- define "d4ily-backend.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "d4ily-backend.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- if contains $name .Release.Name -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "d4ily-backend.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Common labels
*/}}
{{- define "d4ily-backend.labels" -}}
helm.sh/chart: {{ include "d4ily-backend.chart" . }}
{{ include "d4ily-backend.selectorLabels" . }}
{{- if .Chart.AppVersion -}}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end -}}
{{- end -}}

{{/*
Selector labels
*/}}
{{- define "d4ily-backend.selectorLabels" -}}
app.kubernetes.io/name: {{ include "d4ily-backend.name" . }}
app.kubernetes.io/instance: {{ include "d4ily-backend.fullname" . }}
{{- end -}}

{{/*
Create the name of the service account to use
*/}}
{{- define "d4ily-backend.serviceAccountName" -}}
{{- if .Values.serviceAccount.create -}}
{{- default (include "d4ily-backend.fullname" .) .Values.serviceAccount.name -}}
{{- else -}}
{{- default "default" .Values.serviceAccount.name -}}
{{- end -}}
{{- end -}}
